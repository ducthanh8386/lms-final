-- SePay payment sessions (platform checkout, mirror band-room flow)

CREATE TABLE IF NOT EXISTS public.payment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_code text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_ids uuid[] NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'succeeded', 'cancelled')),
  provider text NOT NULL DEFAULT 'sepay',
  provider_tx_id text,
  qr_url text,
  expires_at timestamptz NOT NULL,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_sessions_user_id ON public.payment_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_status ON public.payment_sessions(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_sessions_provider_tx
  ON public.payment_sessions(provider_tx_id)
  WHERE provider_tx_id IS NOT NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_code text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_payment_code ON public.orders(payment_code);

ALTER TABLE public.payment_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own payment sessions" ON public.payment_sessions;
CREATE POLICY "Users view own payment sessions" ON public.payment_sessions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin view all payment sessions" ON public.payment_sessions;
CREATE POLICY "Admin view all payment sessions" ON public.payment_sessions
  FOR SELECT USING ((auth.jwt() -> 'app_metadata' ->> 'userrole') = 'admin');

-- Complete payment: mark session + orders completed, enroll all courses
CREATE OR REPLACE FUNCTION public.complete_payment_session(
  p_payment_code text,
  p_provider_tx_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.payment_sessions%ROWTYPE;
  v_order_id uuid;
  v_user_id uuid;
BEGIN
  SELECT * INTO v_session
  FROM public.payment_sessions
  WHERE payment_code = p_payment_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy phiên thanh toán';
  END IF;

  IF v_session.status = 'succeeded' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already_completed', true,
      'payment_code', v_session.payment_code
    );
  END IF;

  IF v_session.status = 'cancelled' THEN
    RAISE EXCEPTION 'Phiên thanh toán đã hủy';
  END IF;

  -- Idempotency: same provider tx already on another session
  IF p_provider_tx_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.payment_sessions
    WHERE provider_tx_id = p_provider_tx_id
      AND payment_code <> p_payment_code
  ) THEN
    RAISE EXCEPTION 'Giao dịch SePay đã gắn phiên khác';
  END IF;

  UPDATE public.payment_sessions
  SET
    status = 'succeeded',
    provider_tx_id = COALESCE(p_provider_tx_id, provider_tx_id),
    paid_at = now(),
    updated_at = now()
  WHERE payment_code = p_payment_code
  RETURNING * INTO v_session;

  v_user_id := v_session.user_id;

  FOREACH v_order_id IN ARRAY v_session.order_ids
  LOOP
    UPDATE public.orders
    SET
      status = 'completed',
      payment_code = v_session.payment_code,
      paid_at = now()
    WHERE id = v_order_id
      AND user_id = v_user_id
      AND status IN ('pending', 'awaiting_confirmation');

    INSERT INTO public.enrollments (user_id, course_id)
    SELECT v_user_id, oi.course_id
    FROM public.order_items oi
    WHERE oi.order_id = v_order_id
    ON CONFLICT (user_id, course_id) DO NOTHING;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'already_completed', false,
    'payment_code', v_session.payment_code,
    'order_ids', to_jsonb(v_session.order_ids)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_payment_session(p_payment_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.payment_sessions%ROWTYPE;
BEGIN
  SELECT * INTO v_session
  FROM public.payment_sessions
  WHERE payment_code = p_payment_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy phiên thanh toán';
  END IF;

  IF v_session.status = 'succeeded' THEN
    RETURN jsonb_build_object('ok', true, 'status', 'succeeded');
  END IF;

  IF v_session.status = 'cancelled' THEN
    RETURN jsonb_build_object('ok', true, 'status', 'cancelled');
  END IF;

  IF v_session.expires_at > now() THEN
    RAISE EXCEPTION 'Phiên thanh toán chưa hết hạn';
  END IF;

  UPDATE public.payment_sessions
  SET status = 'cancelled', updated_at = now()
  WHERE payment_code = p_payment_code;

  -- Orders stay pending until cancel_payment_session marks them cancelled (see later migration)
  RETURN jsonb_build_object('ok', true, 'status', 'cancelled');
END;
$$;

-- Only service role / edge should call complete; revoke from authenticated
REVOKE ALL ON FUNCTION public.complete_payment_session(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_payment_session(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_payment_session(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_payment_session(text) TO service_role;

-- Authenticated can cancel own expired via edge only; also allow service_role
-- Students read own sessions via RLS SELECT
