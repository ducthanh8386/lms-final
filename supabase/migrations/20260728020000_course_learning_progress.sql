-- F8-style learning progress for purchase/video courses

ALTER TABLE public.lesson_progress
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN public.lesson_progress.updated_at IS
  'Last touch/update for this lesson progress row';

CREATE TABLE IF NOT EXISTS public.course_learning_progress (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  last_lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  last_studied_at timestamptz,
  completed_lessons int NOT NULL DEFAULT 0,
  total_lessons int NOT NULL DEFAULT 0,
  progress_percent int NOT NULL DEFAULT 0
    CHECK (progress_percent >= 0 AND progress_percent <= 100),
  study_seconds int NOT NULL DEFAULT 0 CHECK (study_seconds >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_clp_course_id ON public.course_learning_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_clp_user_id ON public.course_learning_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_clp_last_studied_at ON public.course_learning_progress(last_studied_at DESC NULLS LAST);

COMMENT ON TABLE public.course_learning_progress IS
  'Per-enrollment learning summary: last lesson, study time, completion % (F8-style)';

ALTER TABLE public.course_learning_progress ENABLE ROW LEVEL SECURITY;

-- Students: own rows
DROP POLICY IF EXISTS "Users view own course learning progress" ON public.course_learning_progress;
CREATE POLICY "Users view own course learning progress" ON public.course_learning_progress
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own course learning progress" ON public.course_learning_progress;
CREATE POLICY "Users insert own course learning progress" ON public.course_learning_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own course learning progress" ON public.course_learning_progress;
CREATE POLICY "Users update own course learning progress" ON public.course_learning_progress
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Teachers / admin: read progress for their courses
DROP POLICY IF EXISTS "Teachers view course learning progress" ON public.course_learning_progress;
CREATE POLICY "Teachers view course learning progress" ON public.course_learning_progress
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'userrole') = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.teacher_id = auth.uid()
    )
  );

-- Teachers / admin: read lesson_progress for their courses
DROP POLICY IF EXISTS "Teachers view lesson progress for own courses" ON public.lesson_progress;
CREATE POLICY "Teachers view lesson progress for own courses" ON public.lesson_progress
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'userrole') = 'admin'
    OR EXISTS (
      SELECT 1
      FROM public.lessons l
      JOIN public.courses c ON c.id = l.course_id
      WHERE l.id = lesson_id AND c.teacher_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.course_learning_progress TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.course_learning_progress_id_seq TO authenticated;

-- Recompute completion counters for a user+course
CREATE OR REPLACE FUNCTION public.recompute_course_learning_progress(
  p_user_id uuid,
  p_course_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total int;
  v_done int;
  v_percent int;
BEGIN
  SELECT COUNT(*)::int INTO v_total
  FROM public.lessons
  WHERE course_id = p_course_id;

  SELECT COUNT(*)::int INTO v_done
  FROM public.lesson_progress lp
  JOIN public.lessons l ON l.id = lp.lesson_id
  WHERE lp.user_id = p_user_id
    AND l.course_id = p_course_id;

  IF v_total > 0 THEN
    v_percent := LEAST(100, ROUND((v_done::numeric / v_total::numeric) * 100)::int);
  ELSE
    v_percent := 0;
  END IF;

  INSERT INTO public.course_learning_progress (
    user_id, course_id, completed_lessons, total_lessons, progress_percent, updated_at
  )
  VALUES (p_user_id, p_course_id, v_done, v_total, v_percent, now())
  ON CONFLICT (user_id, course_id) DO UPDATE SET
    completed_lessons = EXCLUDED.completed_lessons,
    total_lessons = EXCLUDED.total_lessons,
    progress_percent = EXCLUDED.progress_percent,
    updated_at = now();
END;
$$;

-- Heartbeat / open lesson: last lesson + study seconds
CREATE OR REPLACE FUNCTION public.touch_learning_progress(
  p_course_id uuid,
  p_lesson_id uuid DEFAULT NULL,
  p_delta_seconds int DEFAULT 0
)
RETURNS public.course_learning_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_delta int := GREATEST(0, LEAST(COALESCE(p_delta_seconds, 0), 120));
  v_row public.course_learning_progress;
  v_lesson_course uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.user_id = v_uid AND e.course_id = p_course_id
  ) THEN
    RAISE EXCEPTION 'Not enrolled in this course';
  END IF;

  IF p_lesson_id IS NOT NULL THEN
    SELECT course_id INTO v_lesson_course
    FROM public.lessons
    WHERE id = p_lesson_id;

    IF v_lesson_course IS NULL OR v_lesson_course <> p_course_id THEN
      RAISE EXCEPTION 'Lesson does not belong to course';
    END IF;
  END IF;

  INSERT INTO public.course_learning_progress (
    user_id,
    course_id,
    last_lesson_id,
    last_studied_at,
    study_seconds,
    updated_at
  )
  VALUES (
    v_uid,
    p_course_id,
    p_lesson_id,
    now(),
    v_delta,
    now()
  )
  ON CONFLICT (user_id, course_id) DO UPDATE SET
    last_lesson_id = COALESCE(EXCLUDED.last_lesson_id, public.course_learning_progress.last_lesson_id),
    last_studied_at = now(),
    study_seconds = public.course_learning_progress.study_seconds + EXCLUDED.study_seconds,
    updated_at = now()
  RETURNING * INTO v_row;

  -- Keep totals fresh if never computed
  IF v_row.total_lessons = 0 THEN
    PERFORM public.recompute_course_learning_progress(v_uid, p_course_id);
    SELECT * INTO v_row
    FROM public.course_learning_progress
    WHERE user_id = v_uid AND course_id = p_course_id;
  END IF;

  RETURN v_row;
END;
$$;

-- Mark lesson complete + refresh percent
CREATE OR REPLACE FUNCTION public.complete_lesson_progress(p_lesson_id uuid)
RETURNS public.course_learning_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_course_id uuid;
  v_row public.course_learning_progress;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT course_id INTO v_course_id
  FROM public.lessons
  WHERE id = p_lesson_id;

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Lesson not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.user_id = v_uid AND e.course_id = v_course_id
  ) THEN
    RAISE EXCEPTION 'Not enrolled in this course';
  END IF;

  INSERT INTO public.lesson_progress (user_id, lesson_id, completed_at, updated_at)
  VALUES (v_uid, p_lesson_id, now(), now())
  ON CONFLICT (user_id, lesson_id) DO UPDATE SET
    updated_at = now();

  PERFORM public.recompute_course_learning_progress(v_uid, v_course_id);

  -- Also mark as last studied lesson
  INSERT INTO public.course_learning_progress (
    user_id, course_id, last_lesson_id, last_studied_at, updated_at
  )
  VALUES (v_uid, v_course_id, p_lesson_id, now(), now())
  ON CONFLICT (user_id, course_id) DO UPDATE SET
    last_lesson_id = EXCLUDED.last_lesson_id,
    last_studied_at = now(),
    updated_at = now();

  PERFORM public.recompute_course_learning_progress(v_uid, v_course_id);

  SELECT * INTO v_row
  FROM public.course_learning_progress
  WHERE user_id = v_uid AND course_id = v_course_id;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.touch_learning_progress(uuid, uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_lesson_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_course_learning_progress(uuid, uuid) TO authenticated;
