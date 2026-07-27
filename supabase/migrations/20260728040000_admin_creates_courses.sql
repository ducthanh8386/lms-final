-- Only admin creates courses; teachers manage assigned courses (update content)

DROP POLICY IF EXISTS "Teachers can insert own courses" ON public.courses;
CREATE POLICY "Admin can insert courses" ON public.courses
  FOR INSERT
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'userrole') = 'admin');

COMMENT ON POLICY "Admin can insert courses" ON public.courses IS
  'Khóa học (video/Zoom) do Admin tạo rồi phân công giáo viên';
