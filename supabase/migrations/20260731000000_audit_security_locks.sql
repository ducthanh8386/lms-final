-- Migration: 20260731000000_audit_security_locks.sql
-- Description: Add row locks (FOR UPDATE) to prevent race conditions during quiz submissions & class joins

-- 1. Secure submit_quiz_attempt with row locking
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
  -- 1. Fetch attempt and lock row to prevent concurrent submissions
  SELECT * INTO v_attempt_record 
  FROM public.quiz_attempts 
  WHERE id = p_attempt_id 
  FOR UPDATE;

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

    -- Extract student's selection for this question from json payload
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

-- 2. Add row lock to class capacity checks in join_class_by_code
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

  -- Lock class row for capacity verification
  SELECT c.id, c.max_students, c.course_id
  INTO v_class_id, v_max, v_course_id
  FROM public.classes c
  WHERE c.invite_code = upper(trim(p_code)) AND c.is_active = true
  FOR UPDATE;

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
