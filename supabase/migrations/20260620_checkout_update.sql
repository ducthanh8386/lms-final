-- Migration for Checkout & Order Approval Features

-- 1. Thêm thông tin thanh toán vào Profiles (Dành cho Teacher)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payment_qr_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_info text;

-- 2. Cập nhật bảng Orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS receipt_url text;

-- 3. Cập nhật Constraint của Orders Status
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending', 'completed', 'rejected'));

-- 4. Tạo Storage Bucket cho Biên lai (receipts)
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true) ON CONFLICT DO NOTHING;

-- Xóa policy cũ nếu có để tránh lỗi
DROP POLICY IF EXISTS "Public Access to Receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;

CREATE POLICY "Public Access to Receipts" ON storage.objects FOR SELECT USING ( bucket_id = 'receipts' );
CREATE POLICY "Authenticated users can upload receipts" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'receipts' AND auth.role() = 'authenticated' );

-- 5. Cho phép Student tạo Order
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
CREATE POLICY "Users can insert own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own order items" ON public.order_items;
CREATE POLICY "Users can insert own order items" ON public.order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_items.order_id AND user_id = auth.uid())
);

-- Bổ sung policy để Teacher có thể SELECT và UPDATE orders của họ
DROP POLICY IF EXISTS "Teacher can view their orders" ON public.orders;
CREATE POLICY "Teacher can view their orders" ON public.orders FOR SELECT USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Teacher can update their orders" ON public.orders;
CREATE POLICY "Teacher can update their orders" ON public.orders FOR UPDATE USING (auth.uid() = teacher_id);

-- Cập nhật Enrollments Policy cho Teacher insert (khi duyệt)
DROP POLICY IF EXISTS "Teachers can insert enrollments" ON public.enrollments;
CREATE POLICY "Teachers can insert enrollments" ON public.enrollments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND teacher_id = auth.uid())
);

-- Cho phép Student tự tạo enrollments nếu có order completed
DROP POLICY IF EXISTS "Students can enroll if order completed" ON public.enrollments;
CREATE POLICY "Students can enroll if order completed" ON public.enrollments FOR INSERT WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (
    SELECT 1 FROM public.orders o 
    JOIN public.order_items oi ON o.id = oi.order_id 
    WHERE o.user_id = auth.uid() AND o.status = 'completed' AND oi.course_id = enrollments.course_id
  )
);
