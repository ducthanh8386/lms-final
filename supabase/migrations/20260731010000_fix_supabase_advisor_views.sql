-- Migration: 20260731010000_fix_supabase_advisor_views.sql
-- Description: Fix Supabase Security Advisor "Security Definer View" critical warnings using ALTER VIEW SET (security_invoker = true).

-- 1. Policy on profiles: Allow reading active profiles for public views (name, avatar, role)
DROP POLICY IF EXISTS "Anyone can view active profiles" ON public.profiles;
CREATE POLICY "Anyone can view active profiles" ON public.profiles
  FOR SELECT USING (status = 'active');

-- 2. Policy on quiz_options: Allow reading options for published quizzes
DROP POLICY IF EXISTS "Anyone can view quiz options for published quizzes" ON public.quiz_options;
CREATE POLICY "Anyone can view quiz options for published quizzes" ON public.quiz_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quiz_questions q
      JOIN public.quizzes z ON z.id = q.quiz_id
      WHERE q.id = quiz_options.question_id AND z.is_published = true
    )
  );

-- 3. Alter Views SET (security_invoker = true) to resolve Supabase Advisor Alerts
ALTER VIEW public.profiles_public SET (security_invoker = true);
ALTER VIEW public.quiz_options_student SET (security_invoker = true);
ALTER VIEW public.courses_public SET (security_invoker = true);
