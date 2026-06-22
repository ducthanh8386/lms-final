-- 1. Add file_url to assignments
ALTER TABLE public.assignments ADD COLUMN file_url text;

-- 2. Create Private Buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('assignment-files', 'assignment-files', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('submission-files', 'submission-files', false) ON CONFLICT DO NOTHING;

-- 3. RLS for assignment-files bucket
-- Path format: course_id/assignment_id/filename.ext
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

-- 4. RLS for submission-files bucket
-- Path format: course_id/assignment_id/filename.ext
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
