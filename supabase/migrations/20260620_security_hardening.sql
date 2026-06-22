-- 1. Sync roles to auth.users for JWT custom claims natively
CREATE OR REPLACE FUNCTION public.sync_role_to_auth()
RETURNS trigger AS $$
BEGIN
  -- Update auth.users with the new role
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('userrole', NEW.role)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_role_update ON public.profiles;

CREATE TRIGGER on_profile_role_update
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.sync_role_to_auth();

-- Backfill existing profiles to auth.users
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, role FROM public.profiles LOOP
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('userrole', r.role)
    WHERE id = r.id;
  END LOOP;
END;
$$;

-- 2. ENABLE RLS ON ALL TABLES (Sanity Check)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 3. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_enrollments_user_course ON public.enrollments(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON public.lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_courses_teacher_id ON public.courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_course ON public.lesson_progress(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON public.submissions(assignment_id);

-- 4. DROP OLD WEAK POLICIES
DROP POLICY IF EXISTS "Public can view lessons of approved courses" ON public.lessons;
DROP POLICY IF EXISTS "Teacher can view own lessons" ON public.lessons;
DROP POLICY IF EXISTS "Teacher can insert own lessons" ON public.lessons;
DROP POLICY IF EXISTS "Teacher can update own lessons" ON public.lessons;
DROP POLICY IF EXISTS "Teacher can delete own lessons" ON public.lessons;

DROP POLICY IF EXISTS "Users can view own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Teachers can view enrollments for their courses" ON public.enrollments;

DROP POLICY IF EXISTS "Public can view approved courses" ON public.courses;
DROP POLICY IF EXISTS "Teacher can view own courses" ON public.courses;
DROP POLICY IF EXISTS "Teacher can insert own course" ON public.courses;
DROP POLICY IF EXISTS "Teacher can update own course" ON public.courses;
DROP POLICY IF EXISTS "Admin full access courses" ON public.courses;
DROP POLICY IF EXISTS "Admin full access enrollments" ON public.enrollments;

-- 5. REWRITE FULL RLS WITH JWT CLAIMS AND STRICT CHECKS

-- ================= COURSES =================
CREATE POLICY "Public views only approved courses" ON public.courses FOR SELECT USING (
  status = 'approved' OR 
  teacher_id = auth.uid() OR 
  (auth.jwt() -> 'app_metadata' ->> 'userrole' = 'admin')
);

CREATE POLICY "Teachers can insert own courses" ON public.courses FOR INSERT WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'userrole' IN ('teacher', 'admin')) AND 
  teacher_id = auth.uid()
);

CREATE POLICY "Teachers can update own courses" ON public.courses FOR UPDATE USING (
  teacher_id = auth.uid() OR (auth.jwt() -> 'app_metadata' ->> 'userrole' = 'admin')
) WITH CHECK (
  teacher_id = auth.uid() OR (auth.jwt() -> 'app_metadata' ->> 'userrole' = 'admin')
);

CREATE POLICY "Teachers can delete own courses" ON public.courses FOR DELETE USING (
  teacher_id = auth.uid() OR (auth.jwt() -> 'app_metadata' ->> 'userrole' = 'admin')
);

-- ================= LESSONS =================
CREATE POLICY "Strict access for lessons" ON public.lessons FOR SELECT USING (
  -- Admin
  (auth.jwt() -> 'app_metadata' ->> 'userrole' = 'admin')
  OR
  -- Teacher of the course
  (EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND teacher_id = auth.uid()))
  OR
  -- Enrolled student
  (EXISTS (SELECT 1 FROM public.enrollments WHERE course_id = lessons.course_id AND user_id = auth.uid()))
);

CREATE POLICY "Teachers can insert lessons" ON public.lessons FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND teacher_id = auth.uid())
);

CREATE POLICY "Teachers can update lessons" ON public.lessons FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND teacher_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND teacher_id = auth.uid())
);

CREATE POLICY "Teachers can delete lessons" ON public.lessons FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND teacher_id = auth.uid())
);

-- ================= ENROLLMENTS =================
-- Only users see their own enrollments, and teacher sees enrollments for their course
CREATE POLICY "Strict view for enrollments" ON public.enrollments FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND teacher_id = auth.uid()) OR
  (auth.jwt() -> 'app_metadata' ->> 'userrole' = 'admin')
);

-- Note: Enrollments do not have INSERT/UPDATE/DELETE from client. Only edge function (service_role) should modify.
