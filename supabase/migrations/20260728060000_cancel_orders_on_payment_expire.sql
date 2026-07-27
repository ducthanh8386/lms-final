-- Hết hạn phiên SePay → hủy luôn đơn (không để kẹt "Chờ TT")

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'awaiting_confirmation', 'completed', 'rejected', 'cancelled'));

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
    -- Đồng bộ đơn còn treo (idempotent)
    UPDATE public.orders
    SET status = 'cancelled'
    WHERE id = ANY (v_session.order_ids)
      AND status IN ('pending', 'awaiting_confirmation');

    RETURN jsonb_build_object('ok', true, 'status', 'cancelled');
  END IF;

  IF v_session.expires_at > now() THEN
    RAISE EXCEPTION 'Phiên thanh toán chưa hết hạn';
  END IF;

  UPDATE public.payment_sessions
  SET status = 'cancelled', updated_at = now()
  WHERE payment_code = p_payment_code;

  UPDATE public.orders
  SET status = 'cancelled'
  WHERE id = ANY (v_session.order_ids)
    AND status IN ('pending', 'awaiting_confirmation');

  RETURN jsonb_build_object('ok', true, 'status', 'cancelled');
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_payment_session(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_payment_session(text) TO service_role;

-- Backfill: đơn đang chờ nhưng phiên đã cancelled
UPDATE public.orders o
SET status = 'cancelled'
FROM public.payment_sessions ps
WHERE ps.status = 'cancelled'
  AND o.id = ANY (ps.order_ids)
  AND o.status IN ('pending', 'awaiting_confirmation');

-- Backfill: đơn pending gắn payment_code của phiên đã huỷ
UPDATE public.orders o
SET status = 'cancelled'
FROM public.payment_sessions ps
WHERE o.payment_code IS NOT NULL
  AND o.payment_code = ps.payment_code
  AND ps.status = 'cancelled'
  AND o.status IN ('pending', 'awaiting_confirmation');
