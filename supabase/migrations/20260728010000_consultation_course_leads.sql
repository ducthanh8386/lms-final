-- Consultation / lead-based courses (e.g. Fullstack Zoom) — no SePay checkout

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS enrollment_mode text NOT NULL DEFAULT 'purchase'
    CHECK (enrollment_mode IN ('purchase', 'consultation'));

COMMENT ON COLUMN public.courses.enrollment_mode IS
  'purchase = mua SePay/video; consultation = để lại thông tin, tư vấn thủ công';

CREATE TABLE IF NOT EXISTS public.course_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  current_status text NOT NULL,
  learning_goal text NOT NULL,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'converted', 'closed')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_leads_course_id ON public.course_leads(course_id);
CREATE INDEX IF NOT EXISTS idx_course_leads_status ON public.course_leads(status);
CREATE INDEX IF NOT EXISTS idx_course_leads_created_at ON public.course_leads(created_at DESC);

ALTER TABLE public.course_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit course leads" ON public.course_leads;
CREATE POLICY "Anyone can submit course leads" ON public.course_leads
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id
        AND c.status = 'approved'
        AND c.enrollment_mode = 'consultation'
    )
  );

DROP POLICY IF EXISTS "Teachers view leads for own courses" ON public.course_leads;
CREATE POLICY "Teachers view leads for own courses" ON public.course_leads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.teacher_id = auth.uid()
    )
    OR (auth.jwt() -> 'app_metadata' ->> 'userrole') = 'admin'
  );

DROP POLICY IF EXISTS "Teachers update leads for own courses" ON public.course_leads;
CREATE POLICY "Teachers update leads for own courses" ON public.course_leads
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.teacher_id = auth.uid()
    )
    OR (auth.jwt() -> 'app_metadata' ->> 'userrole') = 'admin'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.teacher_id = auth.uid()
    )
    OR (auth.jwt() -> 'app_metadata' ->> 'userrole') = 'admin'
  );

-- Allow anonymous insert via anon key (form may be filled before login)
GRANT INSERT ON public.course_leads TO anon, authenticated;
GRANT SELECT, UPDATE ON public.course_leads TO authenticated;
