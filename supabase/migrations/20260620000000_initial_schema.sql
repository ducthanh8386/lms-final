-- Consolidated Initial Schema for LMS + Marketplace (Squashed)

-- 1. Setup profiles table
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name text,
  email text,
  role text CHECK (role IN ('admin','teacher','student')) DEFAULT 'student',
  avatar text,
  status text CHECK (status IN ('active','banned')) DEFAULT 'active',
  payment_qr_url text,
  bank_info text,
  created_at timestamp DEFAULT now()
);

-- 2. Trigger function to sync profile role update to auth.users raw_app_meta_data
CREATE OR REPLACE FUNCTION public.sync_role_to_auth()
RETURNS trigger AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('userrole', NEW.role)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_role_update
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.sync_role_to_auth();

-- 3. Trigger function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'student',
    new.email
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Categories table
CREATE TABLE public.categories (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL
);

-- 5. Courses table
CREATE TABLE public.courses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  price numeric(10,2) DEFAULT 0,
  is_free boolean DEFAULT false,
  thumbnail text,
  teacher_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id bigint REFERENCES public.categories(id),
  status text CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  created_at timestamp DEFAULT now()
);

-- 6. Lessons table
CREATE TABLE public.lessons (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  content_type text CHECK (content_type IN ('video','text')),
  content text,           -- text content or video link (YouTube)
  order_index int DEFAULT 0,
  created_at timestamp DEFAULT now()
);

-- 7. Lesson Progress table
CREATE TABLE public.lesson_progress (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed_at timestamp DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- 8. Enrollments table
CREATE TABLE public.enrollments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at timestamp DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- 9. Orders table
CREATE TABLE public.orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_price numeric(10,2),
  status text CHECK (status IN ('pending','completed','rejected')) DEFAULT 'pending',
  teacher_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  receipt_url text,
  created_at timestamp DEFAULT now()
);

-- 10. Order Items table
CREATE TABLE public.order_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  price numeric(10,2)
);

-- 11. Assignments table
CREATE TABLE public.assignments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  title text,
  description text,
  file_url text,
  due_date timestamp
);

-- 12. Submissions table
CREATE TABLE public.submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id uuid REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_url text,
  grade numeric(5,2),
  feedback text,
  submitted_at timestamp DEFAULT now()
);

-- 13. Reviews table
CREATE TABLE public.reviews (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  rating int CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamp DEFAULT now()
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_enrollments_user_course ON public.enrollments(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON public.lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_courses_teacher_id ON public.courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_course ON public.lesson_progress(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON public.submissions(assignment_id);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
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

-- --- PROFILES ---
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (
  auth.uid() = id
) WITH CHECK (
  auth.uid() = id AND
  role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
  status = (SELECT status FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Admin can update any profile" ON public.profiles FOR UPDATE USING (
  (auth.jwt() -> 'app_metadata' ->> 'userrole') = 'admin'
);

-- --- CATEGORIES ---
CREATE POLICY "Categories viewable by everyone." ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admin full access categories" ON public.categories FOR ALL USING (
  (auth.jwt() -> 'app_metadata' ->> 'userrole') = 'admin'
);

-- --- COURSES ---
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

-- --- LESSONS ---
CREATE POLICY "Strict access for lessons" ON public.lessons FOR SELECT USING (
  (auth.jwt() -> 'app_metadata' ->> 'userrole' = 'admin')
  OR
  (EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND teacher_id = auth.uid()))
  OR
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

-- --- LESSON PROGRESS ---
CREATE POLICY "Users can view own progress" ON public.lesson_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON public.lesson_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own progress" ON public.lesson_progress FOR DELETE USING (auth.uid() = user_id);

-- --- ENROLLMENTS ---
CREATE POLICY "Strict view for enrollments" ON public.enrollments FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND teacher_id = auth.uid()) OR
  (auth.jwt() -> 'app_metadata' ->> 'userrole' = 'admin')
);

CREATE POLICY "Teachers can insert enrollments" ON public.enrollments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND teacher_id = auth.uid())
);

CREATE POLICY "Students can enroll if order completed" ON public.enrollments FOR INSERT WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (
    SELECT 1 FROM public.orders o 
    JOIN public.order_items oi ON o.id = oi.order_id 
    WHERE o.user_id = auth.uid() AND o.status = 'completed' AND oi.course_id = enrollments.course_id
  )
);
-- Note: Enrollments can be inserted by student (if order completed) or by teacher (when approving orders).

-- --- ORDERS & ORDER ITEMS ---
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Teacher can view their orders" ON public.orders FOR SELECT USING (auth.uid() = teacher_id);
CREATE POLICY "Teacher can update their orders" ON public.orders FOR UPDATE USING (auth.uid() = teacher_id);

CREATE POLICY "Admin full access orders" ON public.orders FOR ALL USING (
  (auth.jwt() -> 'app_metadata' ->> 'userrole') = 'admin'
);

CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
);

CREATE POLICY "Users can insert own order items" ON public.order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid())
);

CREATE POLICY "Teacher can view their order items" ON public.order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.orders o 
    WHERE o.id = order_items.order_id AND o.teacher_id = auth.uid()
  )
);

CREATE POLICY "Admin full access order items" ON public.order_items FOR ALL USING (
  (auth.jwt() -> 'app_metadata' ->> 'userrole') = 'admin'
);

-- --- ASSIGNMENTS ---
CREATE POLICY "Enrolled students can view assignments" ON public.assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.enrollments WHERE course_id = assignments.course_id AND user_id = auth.uid())
);

CREATE POLICY "Teacher can view/manage assignments" ON public.assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND teacher_id = auth.uid())
);

-- --- SUBMISSIONS ---
CREATE POLICY "Students can view own submissions" ON public.submissions FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students can insert own submissions" ON public.submissions FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students can update own submissions (before graded)" ON public.submissions FOR UPDATE USING (student_id = auth.uid() AND grade IS NULL);

CREATE POLICY "Teachers can view/update submissions for their courses" ON public.submissions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.assignments 
    JOIN public.courses ON assignments.course_id = courses.id
    WHERE assignments.id = assignment_id AND courses.teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers can grade submissions" ON public.submissions FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.assignments 
    JOIN public.courses ON assignments.course_id = courses.id
    WHERE assignments.id = assignment_id AND courses.teacher_id = auth.uid()
  )
);

-- --- REVIEWS ---
CREATE POLICY "Public can view reviews" ON public.reviews FOR SELECT USING (true);

CREATE POLICY "Enrolled students can insert reviews" ON public.reviews FOR INSERT WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (SELECT 1 FROM public.enrollments WHERE user_id = auth.uid() AND course_id = reviews.course_id)
);

CREATE POLICY "Users can update own reviews." ON public.reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews." ON public.reviews FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- STORAGE BUCKETS CONFIGURATION
-- ==========================================
INSERT INTO storage.buckets (id, name, public) VALUES ('course-thumbnails', 'course-thumbnails', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('assignment-files', 'assignment-files', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('submission-files', 'submission-files', false) ON CONFLICT DO NOTHING;

-- --- course-thumbnails storage policies ---
CREATE POLICY "Public Access to Thumbnails" ON storage.objects FOR SELECT USING ( bucket_id = 'course-thumbnails' );
CREATE POLICY "Authenticated users can upload thumbnails" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'course-thumbnails' AND auth.role() = 'authenticated' );
CREATE POLICY "Users can update own thumbnails" ON storage.objects FOR UPDATE USING ( bucket_id = 'course-thumbnails' AND auth.role() = 'authenticated' );

-- --- receipts storage policies ---
CREATE POLICY "Public Access to Receipts" ON storage.objects FOR SELECT USING ( bucket_id = 'receipts' );
CREATE POLICY "Authenticated users can upload receipts" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'receipts' AND auth.role() = 'authenticated' );

-- --- assignment-files storage policies ---
CREATE POLICY "Enrolled students and teacher can view assignment files" ON storage.objects FOR SELECT USING (
  bucket_id = 'assignment-files' AND (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE id = (storage.foldername(name))[1]::uuid 
      AND teacher_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.enrollments 
      WHERE course_id = (storage.foldername(name))[1]::uuid 
      AND user_id = auth.uid()
    )
  )
);

CREATE POLICY "Teacher can insert assignment files" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'assignment-files' AND auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.courses 
    WHERE id = (storage.foldername(name))[1]::uuid 
    AND teacher_id = auth.uid()
  )
);

CREATE POLICY "Teacher can update assignment files" ON storage.objects FOR UPDATE USING (
  bucket_id = 'assignment-files' AND auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.courses 
    WHERE id = (storage.foldername(name))[1]::uuid 
    AND teacher_id = auth.uid()
  )
);

CREATE POLICY "Teacher can delete assignment files" ON storage.objects FOR DELETE USING (
  bucket_id = 'assignment-files' AND auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.courses 
    WHERE id = (storage.foldername(name))[1]::uuid 
    AND teacher_id = auth.uid()
  )
);

-- --- submission-files storage policies ---
CREATE POLICY "Teacher or Student can view submission files" ON storage.objects FOR SELECT USING (
  bucket_id = 'submission-files' AND (
    auth.uid() = owner
    OR
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE id = (storage.foldername(name))[1]::uuid 
      AND teacher_id = auth.uid()
    )
  )
);

CREATE POLICY "Enrolled students can insert submission files" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'submission-files' AND auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.enrollments 
    WHERE course_id = (storage.foldername(name))[1]::uuid 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Enrolled students can update submission files" ON storage.objects FOR UPDATE USING (
  bucket_id = 'submission-files' AND auth.role() = 'authenticated' AND
  auth.uid() = owner
);

CREATE POLICY "Enrolled students can delete submission files" ON storage.objects FOR DELETE USING (
  bucket_id = 'submission-files' AND auth.role() = 'authenticated' AND
  auth.uid() = owner
);
