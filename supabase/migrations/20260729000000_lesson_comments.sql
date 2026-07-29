-- Lesson Q&A (F8-style comments under video lessons)

CREATE TABLE IF NOT EXISTS public.lesson_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.lesson_comments(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(trim(body)) > 0 AND char_length(body) <= 5000),
  like_count int NOT NULL DEFAULT 0 CHECK (like_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lesson_comments_lesson
  ON public.lesson_comments (lesson_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_lesson_comments_parent
  ON public.lesson_comments (parent_id);

CREATE TABLE IF NOT EXISTS public.lesson_comment_likes (
  comment_id uuid NOT NULL REFERENCES public.lesson_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

CREATE OR REPLACE FUNCTION public.touch_lesson_comment_updated()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lesson_comments_updated ON public.lesson_comments;
CREATE TRIGGER trg_lesson_comments_updated
  BEFORE UPDATE ON public.lesson_comments
  FOR EACH ROW EXECUTE FUNCTION public.touch_lesson_comment_updated();

CREATE OR REPLACE FUNCTION public.sync_lesson_comment_like_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.lesson_comments
    SET like_count = like_count + 1
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.lesson_comments
    SET like_count = GREATEST(like_count - 1, 0)
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_lesson_comment_likes_count ON public.lesson_comment_likes;
CREATE TRIGGER trg_lesson_comment_likes_count
  AFTER INSERT OR DELETE ON public.lesson_comment_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_lesson_comment_like_count();

CREATE OR REPLACE FUNCTION public.can_access_lesson_qa(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'userrole') = 'admin'
      OR EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.course_id = p_course_id AND e.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.id = p_course_id AND c.teacher_id = auth.uid()
      )
    );
$$;

ALTER TABLE public.lesson_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "QA select enrolled" ON public.lesson_comments;
CREATE POLICY "QA select enrolled" ON public.lesson_comments
  FOR SELECT USING (public.can_access_lesson_qa(course_id));

DROP POLICY IF EXISTS "QA insert enrolled" ON public.lesson_comments;
CREATE POLICY "QA insert enrolled" ON public.lesson_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND public.can_access_lesson_qa(course_id)
  );

DROP POLICY IF EXISTS "QA update own" ON public.lesson_comments;
CREATE POLICY "QA update own" ON public.lesson_comments
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "QA delete own or teacher" ON public.lesson_comments;
CREATE POLICY "QA delete own or teacher" ON public.lesson_comments
  FOR DELETE USING (
    auth.uid() = user_id
    OR (auth.jwt() -> 'app_metadata' ->> 'userrole') = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "QA likes select" ON public.lesson_comment_likes;
CREATE POLICY "QA likes select" ON public.lesson_comment_likes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.lesson_comments c
      WHERE c.id = comment_id AND public.can_access_lesson_qa(c.course_id)
    )
  );

DROP POLICY IF EXISTS "QA likes insert" ON public.lesson_comment_likes;
CREATE POLICY "QA likes insert" ON public.lesson_comment_likes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.lesson_comments c
      WHERE c.id = comment_id AND public.can_access_lesson_qa(c.course_id)
    )
  );

DROP POLICY IF EXISTS "QA likes delete" ON public.lesson_comment_likes;
CREATE POLICY "QA likes delete" ON public.lesson_comment_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Feed with author info (bypass profiles RLS for name/avatar only)
CREATE OR REPLACE FUNCTION public.get_lesson_comments(p_lesson_id uuid)
RETURNS TABLE (
  id uuid,
  lesson_id uuid,
  course_id uuid,
  user_id uuid,
  parent_id uuid,
  body text,
  like_count int,
  created_at timestamptz,
  updated_at timestamptz,
  author_name text,
  author_avatar text,
  liked_by_me boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.lesson_id,
    c.course_id,
    c.user_id,
    c.parent_id,
    c.body,
    c.like_count,
    c.created_at,
    c.updated_at,
    p.name,
    p.avatar,
    EXISTS (
      SELECT 1 FROM public.lesson_comment_likes l
      WHERE l.comment_id = c.id AND l.user_id = auth.uid()
    )
  FROM public.lesson_comments c
  JOIN public.profiles p ON p.id = c.user_id
  WHERE c.lesson_id = p_lesson_id
    AND public.can_access_lesson_qa(c.course_id)
  ORDER BY c.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.can_access_lesson_qa(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lesson_comments(uuid) TO authenticated;

-- All comments in a course (teacher inbox)
CREATE OR REPLACE FUNCTION public.get_course_lesson_comments(p_course_id uuid)
RETURNS TABLE (
  id uuid,
  lesson_id uuid,
  course_id uuid,
  user_id uuid,
  parent_id uuid,
  body text,
  like_count int,
  created_at timestamptz,
  updated_at timestamptz,
  author_name text,
  author_avatar text,
  liked_by_me boolean,
  lesson_title text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.lesson_id,
    c.course_id,
    c.user_id,
    c.parent_id,
    c.body,
    c.like_count,
    c.created_at,
    c.updated_at,
    p.name,
    p.avatar,
    EXISTS (
      SELECT 1 FROM public.lesson_comment_likes l
      WHERE l.comment_id = c.id AND l.user_id = auth.uid()
    ),
    les.title
  FROM public.lesson_comments c
  JOIN public.profiles p ON p.id = c.user_id
  JOIN public.lessons les ON les.id = c.lesson_id
  WHERE c.course_id = p_course_id
    AND public.can_access_lesson_qa(c.course_id)
  ORDER BY c.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_course_lesson_comments(uuid) TO authenticated;
