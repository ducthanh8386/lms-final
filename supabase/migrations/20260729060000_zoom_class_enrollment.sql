-- Khi HV vào lớp Zoom (xếp lớp / nhập mã) → ghi enrollments để hiện ở "Khóa học của tôi"

CREATE OR REPLACE FUNCTION public.enroll_student_in_zoom_course(
  p_user_id uuid,
  p_course_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR p_course_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.courses
    WHERE id = p_course_id AND enrollment_mode = 'consultation'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.enrollments (user_id, course_id)
  VALUES (p_user_id, p_course_id)
  ON CONFLICT (user_id, course_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.enroll_student_in_zoom_course(uuid, uuid) FROM PUBLIC;

-- place_lead_into_class: thêm enrollment
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
  v_mode text;
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

  SELECT enrollment_mode, title INTO v_mode, v_course_title
  FROM public.courses
  WHERE id = v_lead.course_id;

  IF v_mode IS DISTINCT FROM 'consultation' THEN
    RAISE EXCEPTION 'Chỉ xếp lớp cho khóa Zoom (consultation)';
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

    PERFORM public.sync_student_to_class_schedules(p_class_id, v_lead.user_id);
    PERFORM public.enroll_student_in_zoom_course(v_lead.user_id, v_lead.course_id);

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

-- join_class_by_code: thêm enrollment
CREATE OR REPLACE FUNCTION public.join_class_by_code(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class_id uuid;
  v_course_id uuid;
  v_count int;
  v_max int;
  v_user_id uuid;
  v_existing_id uuid;
  v_existing_status text;
  v_mode text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Người dùng chưa đăng nhập';
  END IF;

  IF NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Tài khoản của bạn đang bị khóa';
  END IF;

  SELECT c.id, c.max_students, c.course_id
  INTO v_class_id, v_max, v_course_id
  FROM public.classes c
  WHERE c.invite_code = upper(trim(p_code)) AND c.is_active = true;

  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'Mã lớp học không hợp lệ hoặc lớp học đã bị đóng.';
  END IF;

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Lớp này chưa gắn khóa Zoom';
  END IF;

  SELECT enrollment_mode INTO v_mode FROM public.courses WHERE id = v_course_id;
  IF v_mode IS DISTINCT FROM 'consultation' THEN
    RAISE EXCEPTION 'Mã này không thuộc lớp Zoom';
  END IF;

  SELECT count(*) INTO v_count FROM public.class_members
    WHERE class_id = v_class_id AND status = 'active';
  IF v_count >= COALESCE(v_max, 50) THEN
    RAISE EXCEPTION 'Lớp học đã đạt số lượng học viên tối đa.';
  END IF;

  SELECT id, status INTO v_existing_id, v_existing_status FROM public.class_members
    WHERE class_id = v_class_id AND student_id = v_user_id;

  IF v_existing_id IS NOT NULL THEN
    IF v_existing_status = 'active' THEN
      RAISE EXCEPTION 'Bạn đã tham gia lớp này rồi!';
    ELSE
      UPDATE public.class_members
      SET status = 'active', joined_at = now()
      WHERE id = v_existing_id;
    END IF;
  ELSE
    INSERT INTO public.class_members (class_id, student_id, status)
    VALUES (v_class_id, v_user_id, 'active');
  END IF;

  PERFORM public.sync_student_to_class_schedules(v_class_id, v_user_id);
  PERFORM public.enroll_student_in_zoom_course(v_user_id, v_course_id);

  RETURN v_class_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_class_by_code(text) TO authenticated;

-- Backfill: HV đã trong lớp Zoom nhưng chưa có enrollment
INSERT INTO public.enrollments (user_id, course_id)
SELECT DISTINCT cm.student_id, cl.course_id
FROM public.class_members cm
JOIN public.classes cl ON cl.id = cm.class_id
JOIN public.courses c ON c.id = cl.course_id
WHERE cm.status = 'active'
  AND cl.course_id IS NOT NULL
  AND c.enrollment_mode = 'consultation'
ON CONFLICT (user_id, course_id) DO NOTHING;
