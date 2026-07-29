-- Chặn trùng đăng ký tư vấn: 1 tài khoản / 1 SĐT / 1 email mỗi khóa Zoom

CREATE OR REPLACE FUNCTION public.normalize_lead_phone(p_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p IS NULL OR p = '' THEN NULL
    WHEN left(p, 2) = '84' AND length(p) >= 10 THEN '0' || substr(p, 3)
    ELSE p
  END
  FROM (
    SELECT regexp_replace(trim(coalesce(p_phone, '')), '[^0-9]', '', 'g') AS p
  ) s;
$$;

CREATE OR REPLACE FUNCTION public.normalize_lead_email(p_email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(lower(trim(coalesce(p_email, ''))), '');
$$;

-- Giữ 1 lead mới nhất / (course, user)
DELETE FROM public.course_leads
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      row_number() OVER (
        PARTITION BY course_id, user_id
        ORDER BY created_at DESC NULLS LAST, id DESC
      ) AS rn
    FROM public.course_leads
    WHERE user_id IS NOT NULL
  ) d
  WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_course_leads_course_user_unique
  ON public.course_leads (course_id, user_id)
  WHERE user_id IS NOT NULL;

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
  v_phone text := public.normalize_lead_phone(p_phone);
  v_email text := public.normalize_lead_email(p_email);
  v_uid uuid := auth.uid();
BEGIN
  IF v_name = '' OR v_phone IS NULL OR v_phone = '' THEN
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

  -- 1 tài khoản chỉ đăng ký 1 lần / khóa
  IF v_uid IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.course_leads l
    WHERE l.course_id = p_course_id
      AND l.user_id = v_uid
      AND l.status IS DISTINCT FROM 'closed'
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_LEAD:Tài khoản này đã đăng ký tư vấn khóa học này rồi';
  END IF;

  -- Trùng SĐT (đã chuẩn hóa)
  IF EXISTS (
    SELECT 1
    FROM public.course_leads l
    WHERE l.course_id = p_course_id
      AND l.status IS DISTINCT FROM 'closed'
      AND public.normalize_lead_phone(l.phone) = v_phone
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_LEAD:Số điện thoại này đã đăng ký tư vấn khóa học này rồi';
  END IF;

  -- Trùng email (nếu có nhập)
  IF v_email IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.course_leads l
    WHERE l.course_id = p_course_id
      AND l.status IS DISTINCT FROM 'closed'
      AND public.normalize_lead_email(l.email) = v_email
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_LEAD:Email này đã đăng ký tư vấn khóa học này rồi';
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
    v_uid,
    v_name,
    v_phone,
    v_email,
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
  'Public form tư vấn Zoom — chặn trùng theo user_id / SĐT / email mỗi khóa';
