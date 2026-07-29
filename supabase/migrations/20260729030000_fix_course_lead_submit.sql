-- Fix: học viên/anon gửi form tư vấn thất bại vì insert().select() bị RLS SELECT chặn.
-- Dùng RPC SECURITY DEFINER để submit ổn định (kể cả chưa đăng nhập).

CREATE OR REPLACE FUNCTION public.submit_course_lead(
  p_course_id uuid,
  p_full_name text,
  p_phone text,
  p_current_status text,
  p_learning_goal text,
  p_email text DEFAULT NULL,
  p_preferred_schedule text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_name text := trim(coalesce(p_full_name, ''));
  v_phone text := trim(coalesce(p_phone, ''));
BEGIN
  IF v_name = '' OR v_phone = '' THEN
    RAISE EXCEPTION 'Họ tên và số điện thoại là bắt buộc';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.courses c
    WHERE c.id = p_course_id
      AND c.status = 'approved'
      AND c.enrollment_mode = 'consultation'
  ) THEN
    RAISE EXCEPTION 'Khóa học không nhận đăng ký tư vấn';
  END IF;

  INSERT INTO public.course_leads (
    course_id,
    user_id,
    full_name,
    phone,
    email,
    current_status,
    learning_goal,
    preferred_schedule,
    notes
  ) VALUES (
    p_course_id,
    auth.uid(),
    v_name,
    v_phone,
    NULLIF(trim(coalesce(p_email, '')), ''),
    p_current_status,
    p_learning_goal,
    NULLIF(trim(coalesce(p_preferred_schedule, '')), ''),
    NULLIF(trim(coalesce(p_notes, '')), '')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_course_lead(
  uuid, text, text, text, text, text, text, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.submit_course_lead(
  uuid, text, text, text, text, text, text, text
) TO anon, authenticated;

COMMENT ON FUNCTION public.submit_course_lead IS
  'Public form: để lại thông tin tư vấn khóa Zoom (bypass SELECT RLS after insert)';
