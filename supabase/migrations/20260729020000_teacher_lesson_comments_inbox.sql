-- Teacher inbox: all lesson Q&A across assigned courses (incl. free)

CREATE OR REPLACE FUNCTION public.get_teacher_lesson_comments()
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
  lesson_title text,
  course_title text
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
    les.title,
    co.title
  FROM public.lesson_comments c
  JOIN public.profiles p ON p.id = c.user_id
  JOIN public.lessons les ON les.id = c.lesson_id
  JOIN public.courses co ON co.id = c.course_id
  WHERE auth.uid() IS NOT NULL
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'userrole') = 'admin'
      OR co.teacher_id = auth.uid()
    )
  ORDER BY c.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_teacher_lesson_comments() TO authenticated;
