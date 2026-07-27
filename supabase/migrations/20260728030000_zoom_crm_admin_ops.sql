-- Zoom CRM + class ops + review replies + attendance + course duration

-- 1) Course metadata for Zoom catalog
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS duration_months int;

COMMENT ON COLUMN public.courses.duration_months IS
  'Thời lượng khóa (tháng), dùng cho khóa Zoom / catalog';

-- 2) Classes: recruiting status + schedule label
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS schedule_label text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'recruiting';

ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_status_check;
ALTER TABLE public.classes
  ADD CONSTRAINT classes_status_check
  CHECK (status IN ('recruiting', 'upcoming', 'ongoing', 'finished'));

COMMENT ON COLUMN public.classes.schedule_label IS 'VD: T2-T4-T6';
COMMENT ON COLUMN public.classes.status IS 'recruiting|upcoming|ongoing|finished';

-- 3) Lead pipeline (Zoom consultation CRM)
ALTER TABLE public.course_leads
  ADD COLUMN IF NOT EXISTS preferred_schedule text,
  ADD COLUMN IF NOT EXISTS consultant_notes text,
  ADD COLUMN IF NOT EXISTS assigned_class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS placed_at timestamptz;

-- Migrate old statuses then tighten check
UPDATE public.course_leads SET status = 'agreed' WHERE status = 'converted';

ALTER TABLE public.course_leads DROP CONSTRAINT IF EXISTS course_leads_status_check;
ALTER TABLE public.course_leads
  ADD CONSTRAINT course_leads_status_check
  CHECK (status IN (
    'new',
    'contacted',
    'consulting',
    'agreed',
    'paid',
    'placed',
    'closed'
  ));

-- 4) Teacher reply on course reviews
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS teacher_reply text,
  ADD COLUMN IF NOT EXISTS teacher_replied_at timestamptz;

DROP POLICY IF EXISTS "Teachers reply reviews on own courses" ON public.reviews;
CREATE POLICY "Teachers reply reviews on own courses" ON public.reviews
  FOR UPDATE USING (
    (auth.jwt() -> 'app_metadata' ->> 'userrole') = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'userrole') = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.teacher_id = auth.uid()
    )
  );

-- 5) Per-session attendance (Zoom)
CREATE TABLE IF NOT EXISTS public.schedule_attendance (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  schedule_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'present'
    CHECK (status IN ('present', 'absent', 'late', 'excused')),
  marked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  note text,
  marked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (schedule_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_schedule_attendance_schedule
  ON public.schedule_attendance(schedule_id);

ALTER TABLE public.schedule_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers manage attendance" ON public.schedule_attendance;
CREATE POLICY "Teachers manage attendance" ON public.schedule_attendance
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'userrole') = 'admin'
    OR public.is_schedule_teacher(schedule_id)
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'userrole') = 'admin'
    OR public.is_schedule_teacher(schedule_id)
  );

DROP POLICY IF EXISTS "Students view own attendance" ON public.schedule_attendance;
CREATE POLICY "Students view own attendance" ON public.schedule_attendance
  FOR SELECT USING (student_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_attendance TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.schedule_attendance_id_seq TO authenticated;

-- Expand notifications types for class placement
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'schedule_reminder',
    'assignment_due',
    'grade_posted',
    'class_invite',
    'order_approved',
    'quiz_available',
    'class_placed',
    'review_reply'
  ));

-- Admin can manage all classes
DROP POLICY IF EXISTS "Admin manages all classes" ON public.classes;
CREATE POLICY "Admin manages all classes" ON public.classes
  FOR ALL USING ((auth.jwt() -> 'app_metadata' ->> 'userrole') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'userrole') = 'admin');

DROP POLICY IF EXISTS "Admin manages all class members" ON public.class_members;
CREATE POLICY "Admin manages all class members" ON public.class_members
  FOR ALL USING ((auth.jwt() -> 'app_metadata' ->> 'userrole') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'userrole') = 'admin');

-- Place lead into Zoom class
CREATE OR REPLACE FUNCTION public.place_lead_into_class(
  p_lead_id uuid,
  p_class_id uuid
)
RETURNS public.course_leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text := auth.jwt() -> 'app_metadata' ->> 'userrole';
  v_lead public.course_leads;
  v_class public.classes;
  v_count int;
  v_course_title text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_lead FROM public.course_leads WHERE id = p_lead_id;
  IF v_lead.id IS NULL THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;

  SELECT * INTO v_class FROM public.classes WHERE id = p_class_id;
  IF v_class.id IS NULL THEN
    RAISE EXCEPTION 'Class not found';
  END IF;

  IF v_class.course_id IS NULL OR v_class.course_id <> v_lead.course_id THEN
    RAISE EXCEPTION 'Class does not belong to the same course as the lead';
  END IF;

  IF NOT (
    v_role = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = v_lead.course_id AND c.teacher_id = v_uid
    )
    OR v_class.teacher_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Not allowed to place this lead';
  END IF;

  SELECT COUNT(*)::int INTO v_count
  FROM public.class_members
  WHERE class_id = p_class_id AND status = 'active';

  IF v_count >= COALESCE(v_class.max_students, 50) THEN
    RAISE EXCEPTION 'Class is full';
  END IF;

  IF v_lead.user_id IS NOT NULL THEN
    INSERT INTO public.class_members (class_id, student_id, status)
    VALUES (p_class_id, v_lead.user_id, 'active')
    ON CONFLICT (class_id, student_id) DO UPDATE SET status = 'active';

    SELECT title INTO v_course_title FROM public.courses WHERE id = v_lead.course_id;

    INSERT INTO public.notifications (user_id, type, title, body, related_id, related_type)
    VALUES (
      v_lead.user_id,
      'class_placed',
      'Bạn đã được xếp lớp',
      COALESCE('Lớp "' || v_class.name || '" — khóa ' || v_course_title, 'Bạn đã được xếp vào lớp Zoom.'),
      p_class_id,
      'class'
    );
  END IF;

  UPDATE public.course_leads
  SET
    status = 'placed',
    assigned_class_id = p_class_id,
    placed_at = now(),
    updated_at = now()
  WHERE id = p_lead_id
  RETURNING * INTO v_lead;

  RETURN v_lead;
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_lead_into_class(uuid, uuid) TO authenticated;
