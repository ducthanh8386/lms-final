-- supabase/migrations/20260716000000_fix_profile_rls_recursion.sql
-- =====================================================================
-- FIX INFINITE RECURSION IN PROFILES RLS POLICIES
-- =====================================================================

-- 1. Helper functions with SECURITY DEFINER to safely read role & status without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.get_profile_role(p_user_id uuid)
RETURNS text
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_profile_status(p_user_id uuid)
RETURNS text
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT status FROM public.profiles WHERE id = p_user_id;
$$;

-- 2. Drop legacy conflicting policies on profiles
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Admin can update any profile" ON public.profiles;

-- 3. Re-create non-recursive policies for profiles UPDATE
CREATE POLICY "Users can update own profile." ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = public.get_profile_role(auth.uid()) AND
    status = public.get_profile_status(auth.uid())
  );

CREATE POLICY "Admin can update any profile" ON public.profiles
  FOR UPDATE
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'userrole') = 'admin' OR
    public.get_profile_role(auth.uid()) = 'admin'
  );
