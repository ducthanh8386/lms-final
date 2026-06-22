-- Migration to allow Teachers to select order_items of their orders

DROP POLICY IF EXISTS "Teacher can view their order items" ON public.order_items;
CREATE POLICY "Teacher can view their order items" ON public.order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.orders o 
    WHERE o.id = order_items.order_id AND o.teacher_id = auth.uid()
  )
);
