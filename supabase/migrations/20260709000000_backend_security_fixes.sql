-- supabase/migrations/20260709000000_backend_security_fixes.sql

-- =====================================================================
-- 0. HELPERS
-- =====================================================================

-- Active user verification helper
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND status = 'active'
  );
$$;

-- =====================================================================
-- 1. BANNED USER PROTECTION (ENFORCE ACTIVE STATE FOR MUTATIONS)
-- =====================================================================

-- To apply is_active_user check, we will integrate it into the WITH CHECK of major tables policies.

-- =====================================================================
-- 2. SECURE PAYMENT BYPASS (CHECKOUT VIA SECURE RPC)
-- =====================================================================

-- Drop direct insert policies for client
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert own order items" ON public.order_items;

-- Modify check constraint on orders status to include 'awaiting_confirmation'
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'awaiting_confirmation', 'completed', 'rejected'));

-- Update policy to allow students to update their own pending orders (receipt_url and status = awaiting_confirmation)
DROP POLICY IF EXISTS "Users can update own pending orders" ON public.orders;
CREATE POLICY "Users can update own pending orders" ON public.orders
  FOR UPDATE 
  USING (auth.uid() = user_id AND status IN ('pending', 'awaiting_confirmation'))
  WITH CHECK (auth.uid() = user_id AND status IN ('pending', 'awaiting_confirmation') AND public.is_active_user());

-- Create the Secure checkout RPC
CREATE OR REPLACE FUNCTION public.checkout_courses(p_course_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_teacher_id uuid;
  v_status text;
  v_total_price numeric(10,2);
  v_result jsonb := '[]'::jsonb;
  v_order_record record;
BEGIN
  -- 1. Get current active user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Người dùng chưa đăng nhập';
  END IF;

  IF NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Tài khoản của bạn đang bị khóa';
  END IF;

  -- Verify courses are approved and active
  IF EXISTS (SELECT 1 FROM unnest(p_course_ids) cid WHERE NOT EXISTS (SELECT 1 FROM public.courses WHERE id = cid AND status = 'approved')) THEN
    RAISE EXCEPTION 'Một số khóa học không tồn tại hoặc chưa được duyệt';
  END IF;

  -- 2. Group by teacher and process orders
  FOR v_teacher_id IN 
    SELECT DISTINCT teacher_id FROM public.courses WHERE id = ANY(p_course_ids)
  LOOP
    -- Calculate total price for this teacher's courses (using price from DB)
    SELECT COALESCE(SUM(CASE WHEN is_free THEN 0 ELSE price END), 0)
    INTO v_total_price
    FROM public.courses
    WHERE id = ANY(p_course_ids) AND teacher_id = v_teacher_id;

    v_status := CASE WHEN v_total_price = 0 THEN 'completed' ELSE 'pending' END;

    -- Create order
    INSERT INTO public.orders (user_id, total_price, status, teacher_id)
    VALUES (v_user_id, v_total_price, v_status, v_teacher_id)
    RETURNING * INTO v_order_record;

    -- Create order_items
    INSERT INTO public.order_items (order_id, course_id, price)
    SELECT v_order_record.id, id, CASE WHEN is_free THEN 0 ELSE price END
    FROM public.courses
    WHERE id = ANY(p_course_ids) AND teacher_id = v_teacher_id;

    -- Auto enroll if free
    IF v_status = 'completed' THEN
      INSERT INTO public.enrollments (user_id, course_id)
      SELECT v_user_id, id
      FROM public.courses
      WHERE id = ANY(p_course_ids) AND teacher_id = v_teacher_id
      ON CONFLICT (user_id, course_id) DO NOTHING;
    END IF;

    -- Add to result
    v_result := v_result || to_jsonb(v_order_record);
  END LOOP;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.checkout_courses(uuid[]) TO authenticated;

-- =====================================================================
-- 3. PAYWALL BYPASS RECTIFICATION
-- =====================================================================

-- Restrict lessons access to only enrolled, teacher, or admin
DROP POLICY IF EXISTS "Strict access for lessons" ON public.lessons;
CREATE POLICY "Strict access for lessons" ON public.lessons FOR SELECT USING (
  (auth.jwt() -> 'app_metadata' ->> 'userrole' = 'admin')
  OR
  (EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND teacher_id = auth.uid()))
  OR
  (EXISTS (SELECT 1 FROM public.enrollments WHERE course_id = lessons.course_id AND user_id = auth.uid()))
);

-- =====================================================================
-- 4. PROFILES TABLE DATA LEAK RECTIFICATION
-- =====================================================================

-- Restrict public profiles select access
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;

-- Only owner, admin, or enrolled students' teachers can select complete profile
CREATE POLICY "Own profile or admin full view" ON public.profiles 
  FOR SELECT USING (
    auth.uid() = id OR (auth.jwt() -> 'app_metadata' ->> 'userrole') = 'admin'
  );

-- Teachers can view profiles of students in their courses or classes
CREATE POLICY "Teacher can view own students profiles" ON public.profiles
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'userrole') = 'teacher' AND (
      EXISTS (
        SELECT 1 FROM public.enrollments e
        JOIN public.courses c ON c.id = e.course_id
        WHERE e.user_id = public.profiles.id AND c.teacher_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.class_members cm
        JOIN public.classes cl ON cl.id = cm.class_id
        WHERE cm.student_id = public.profiles.id AND cl.teacher_id = auth.uid()
      )
    )
  );

-- Public view excluding sensitive details (email, bank_info, payment_qr_url)
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT id, name, avatar, role FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- Secure payment details retrieval RPC for checkout flow
CREATE OR REPLACE FUNCTION public.get_teacher_payment_info(p_teacher_ids uuid[])
RETURNS TABLE (id uuid, name text, bank_info text, payment_qr_url text)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT id, name, bank_info, payment_qr_url 
  FROM public.profiles
  WHERE id = ANY(p_teacher_ids);
$$;

GRANT EXECUTE ON FUNCTION public.get_teacher_payment_info(uuid[]) TO authenticated;

-- =====================================================================
-- 5. QUIZ CORRECT ANSWERS LEAK RECTIFICATION
-- =====================================================================

-- Restrict direct selection of quiz options for students
DROP POLICY IF EXISTS "Student reads quiz options" ON public.quiz_options;

-- View excluding is_correct column for student
CREATE OR REPLACE VIEW public.quiz_options_student AS
SELECT id, question_id, option_text, order_index
FROM public.quiz_options;

GRANT SELECT ON public.quiz_options_student TO anon, authenticated;

-- =====================================================================
-- 6. SECURE QUIZ GRADING (RPC EVALUATION)
-- =====================================================================

-- Restrict quiz_attempts and quiz_answers client-side updates
DROP POLICY IF EXISTS "Student manages own attempts" ON public.quiz_attempts;
CREATE POLICY "Student creates own attempt" ON public.quiz_attempts
  FOR INSERT WITH CHECK (student_id = auth.uid() AND public.is_active_user());
CREATE POLICY "Student views own attempt" ON public.quiz_attempts
  FOR SELECT USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Student manages own answers" ON public.quiz_answers;
CREATE POLICY "Student inserts own raw answers" ON public.quiz_answers
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.quiz_attempts qa WHERE qa.id = attempt_id AND qa.student_id = auth.uid())
    AND public.is_active_user()
  );
CREATE POLICY "Student views own answers" ON public.quiz_answers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.quiz_attempts qa WHERE qa.id = attempt_id AND qa.student_id = auth.uid())
  );

-- Secure grading RPC
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(p_attempt_id uuid, p_answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_attempt_record record;
  v_quiz_id uuid;
  v_student_id uuid;
  v_question_record record;
  v_selected_ids uuid[];
  v_correct_ids uuid[];
  v_is_correct boolean;
  v_points numeric(5,2);
  v_points_earned numeric(5,2);
  v_total_points numeric(5,2) := 0;
  v_earned_points numeric(5,2) := 0;
  v_score numeric(5,2);
  v_submitted_at timestamptz;
  v_time_taken int;
BEGIN
  -- 1. Fetch attempt and verify current user owns it
  SELECT * INTO v_attempt_record FROM public.quiz_attempts WHERE id = p_attempt_id;
  IF v_attempt_record IS NULL THEN
    RAISE EXCEPTION 'Lượt thi không tồn tại';
  END IF;
  
  IF v_attempt_record.student_id <> auth.uid() THEN
    RAISE EXCEPTION 'Bạn không có quyền nộp bài cho lượt thi này';
  END IF;

  IF NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Tài khoản của bạn đã bị khóa';
  END IF;

  IF v_attempt_record.submitted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Lượt thi này đã được nộp trước đó';
  END IF;

  v_quiz_id := v_attempt_record.quiz_id;
  v_student_id := v_attempt_record.student_id;

  -- 2. Clear any existing quiz_answers for this attempt to prevent duplicates
  DELETE FROM public.quiz_answers WHERE attempt_id = p_attempt_id;

  -- 3. Loop through all questions in this quiz
  FOR v_question_record IN 
    SELECT id, points, question_type FROM public.quiz_questions WHERE quiz_id = v_quiz_id
  LOOP
    v_points := COALESCE(v_question_record.points, 0);
    v_total_points := v_total_points + v_points;

    -- Extract student's selection for this question from json payload: [{questionId: '...', selectedOptionIds: ['...']}]
    v_selected_ids := '{}';
    
    SELECT ARRAY(
      SELECT (val->>0)::uuid 
      FROM jsonb_array_elements(
        COALESCE(
          (SELECT value->'selectedOptionIds' 
           FROM jsonb_array_elements(p_answers) 
           WHERE (value->>'questionId')::uuid = v_question_record.id), 
          '[]'::jsonb
        )
      ) AS val
    ) INTO v_selected_ids;

    -- Get correct options from DB
    SELECT ARRAY(
      SELECT id FROM public.quiz_options WHERE question_id = v_question_record.id AND is_correct = true
    ) INTO v_correct_ids;

    -- Grade comparison
    v_is_correct := false;
    IF array_length(v_selected_ids, 1) IS NOT NULL AND array_length(v_selected_ids, 1) = array_length(v_correct_ids, 1) THEN
      v_is_correct := (SELECT ALL(SELECT unnest(v_selected_ids) = ANY(v_correct_ids)));
    ELSIF COALESCE(array_length(v_selected_ids, 1), 0) = 0 AND COALESCE(array_length(v_correct_ids, 1), 0) = 0 THEN
      v_is_correct := true;
    END IF;

    v_points_earned := CASE WHEN v_is_correct THEN v_points ELSE 0 END;
    v_earned_points := v_earned_points + v_points_earned;

    -- Insert answer record
    INSERT INTO public.quiz_answers (attempt_id, question_id, selected_option_ids, is_correct, points_earned)
    VALUES (p_attempt_id, v_question_record.id, v_selected_ids, v_is_correct, v_points_earned);
  END LOOP;

  -- 4. Calculate final score
  v_score := CASE WHEN v_total_points > 0 THEN ROUND((v_earned_points / v_total_points) * 100, 2) ELSE 0 END;
  v_submitted_at := now();
  v_time_taken := ROUND(EXTRACT(EPOCH FROM (v_submitted_at - v_attempt_record.started_at)));

  -- 5. Update attempt
  UPDATE public.quiz_attempts
  SET score = v_score,
      submitted_at = v_submitted_at,
      time_taken_seconds = v_time_taken
  WHERE id = p_attempt_id
  RETURNING * INTO v_attempt_record;

  RETURN to_jsonb(v_attempt_record);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, jsonb) TO authenticated;

-- =====================================================================
-- 7. TEACHER COURSE STATUS TRIGGER
-- =====================================================================

CREATE OR REPLACE FUNCTION public.prevent_teacher_status_change()
RETURNS trigger AS $$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'userrole') <> 'admin'
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Chỉ Admin mới được thay đổi trạng thái khóa học';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_teacher_status_change ON public.courses;
CREATE TRIGGER trg_prevent_teacher_status_change
BEFORE UPDATE ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.prevent_teacher_status_change();

-- =====================================================================
-- 8. SECURE CLASS INVITE & CODES LEAKS
-- =====================================================================

DROP POLICY IF EXISTS "Anyone can view active classes" ON public.classes;

DROP POLICY IF EXISTS "Student joins class" ON public.class_members;

-- RPC for class search by code
CREATE OR REPLACE FUNCTION public.find_class_by_invite_code(p_code text)
RETURNS TABLE (id uuid, name text, teacher_id uuid, max_students int, teacher_name text)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.teacher_id, c.max_students, p.name AS teacher_name
  FROM public.classes c
  LEFT JOIN public.profiles p ON p.id = c.teacher_id
  WHERE c.invite_code = upper(trim(p_code)) AND c.is_active = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_class_by_invite_code(text) TO authenticated;

-- RPC for joining class securely
CREATE OR REPLACE FUNCTION public.join_class_by_code(p_code text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_class_id uuid;
  v_count int;
  v_max int;
  v_user_id uuid;
  v_existing_id uuid;
  v_existing_status text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Người dùng chưa đăng nhập';
  END IF;

  IF NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Tài khoản của bạn đang bị khóa';
  END IF;

  -- 1. Find class by code
  SELECT id, max_students INTO v_class_id, v_max FROM public.classes
    WHERE invite_code = upper(trim(p_code)) AND is_active = true;
  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'Mã lớp học không hợp lệ hoặc lớp học đã bị đóng.';
  END IF;

  -- 2. Check current student limit
  SELECT count(*) INTO v_count FROM public.class_members
    WHERE class_id = v_class_id AND status = 'active';
  IF v_count >= COALESCE(v_max, 50) THEN
    RAISE EXCEPTION 'Lớp học đã đạt số lượng học viên tối đa.';
  END IF;

  -- 3. Check existing membership
  SELECT id, status INTO v_existing_id, v_existing_status FROM public.class_members
    WHERE class_id = v_class_id AND student_id = v_user_id;

  IF v_existing_id IS NOT NULL THEN
    IF v_existing_status = 'active' THEN
      RAISE EXCEPTION 'Bạn đã tham gia lớp này rồi!';
    ELSE
      -- Reactivate membership
      UPDATE public.class_members 
      SET status = 'active', joined_at = now()
      WHERE id = v_existing_id;
    END IF;
  ELSE
    -- Insert new membership
    INSERT INTO public.class_members (class_id, student_id, status)
    VALUES (v_class_id, v_user_id, 'active');
  END IF;

  RETURN v_class_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_class_by_code(text) TO authenticated;

-- =====================================================================
-- 9. NOTIFICATION BELL SECURITY
-- =====================================================================

DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Only teachers or admin notify" ON public.notifications
  FOR INSERT WITH CHECK (
    ((auth.jwt() -> 'app_metadata' ->> 'userrole') IN ('teacher', 'admin'))
    AND public.is_active_user()
  );

-- =====================================================================
-- 10. RECEIPTS & THUMBNAILS STORAGE PROTECTION
-- =====================================================================

-- Update receipts bucket to private
UPDATE storage.buckets SET public = false WHERE id = 'receipts';

-- Secure storage objects rules for receipts bucket
DROP POLICY IF EXISTS "Owner and teacher view receipts" ON storage.objects;
CREATE POLICY "Owner and teacher view receipts" ON storage.objects 
  FOR SELECT USING (
    bucket_id = 'receipts' AND (
      EXISTS (SELECT 1 FROM public.orders o WHERE o.receipt_url LIKE '%' || storage.objects.name AND o.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.orders o WHERE o.receipt_url LIKE '%' || storage.objects.name AND o.teacher_id = auth.uid())
      OR (auth.jwt() -> 'app_metadata' ->> 'userrole') = 'admin'
    )
  );

-- Thumbnail ownership locks
DROP POLICY IF EXISTS "Users can update own thumbnails" ON storage.objects;
CREATE POLICY "Only owner teacher can update own thumbnails" ON storage.objects 
  FOR UPDATE USING (
    bucket_id = 'course-thumbnails' AND owner = auth.uid()
  );

-- =====================================================================
-- 11. RSVP ATTENDANCE CALENDAR FIX
-- =====================================================================

DROP POLICY IF EXISTS "Student confirms own attendance" ON public.schedule_participants;
CREATE POLICY "Student confirms own attendance" ON public.schedule_participants
  FOR UPDATE USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid() AND public.is_active_user());

-- =====================================================================
-- 12. PUBLIC COURSES SEARCH VIEW
-- =====================================================================

CREATE OR REPLACE VIEW public.courses_public AS
SELECT 
  c.*,
  p.name AS teacher_name,
  cat.name AS category_name
FROM public.courses c
LEFT JOIN public.profiles_public p ON p.id = c.teacher_id
LEFT JOIN public.categories cat ON cat.id = c.category_id;

GRANT SELECT ON public.courses_public TO anon, authenticated;
