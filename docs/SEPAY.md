# SePay (LMS) — cấu hình

Thanh toán học viên qua SePay VietQR + poll API + webhook, giống band-room-management.

## 1. Chạy migration

```bash
supabase db push
# hoặc áp dụng file:
# supabase/migrations/20260728000000_sepay_payment_sessions.sql
```

## 2. Secrets Edge Functions

```bash
supabase secrets set \
  SEPAY_QR_BANK_ACCOUNT="số_tài_khoản" \
  SEPAY_QR_BANK_CODE="mã_BIN_ngân_hàng" \
  SEPAY_QR_TEMPLATE="compact" \
  SEPAY_API_ACCESS_TOKEN="token_API_SePay" \
  SEPAY_API_ACCOUNT_NUMBER="số_TK_lọc_giao_dịch" \
  SEPAY_IPN_SECRET="secret_IPN" \
  SEPAY_WEBHOOK_HMAC_SECRET="hmac_secret" \
  SEPAY_PAYMENT_EXPIRATION_SECONDS="300"
```

| Biến | Mục đích |
|------|----------|
| `SEPAY_QR_BANK_ACCOUNT` | STK trên VietQR |
| `SEPAY_QR_BANK_CODE` | Mã bank / BIN VietQR |
| `SEPAY_API_ACCESS_TOKEN` | Bearer token gọi SePay Transactions API (poll) |
| `SEPAY_IPN_SECRET` | Xác thực webhook IPN (`X-Secret-Key`) |
| `SEPAY_WEBHOOK_HMAC_SECRET` | HMAC bank-transfer webhook |
| `SEPAY_PAYMENT_EXPIRATION_SECONDS` | TTL phiên (mặc định 300s = 5 phút) |

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` có sẵn trên Edge runtime.

## 3. Deploy functions

```bash
supabase functions deploy create-payment-session
supabase functions deploy sync-payment
supabase functions deploy sepay-webhook
```

## 4. Webhook URL trên SePay

```
https://<PROJECT_REF>.supabase.co/functions/v1/sepay-webhook
```

Đăng ký trong dashboard SePay (bank transfer webhook và/hoặc Payment Gateway IPN).

## 5. Luồng

1. Học viên checkout → `checkout_courses` tạo orders `pending`
2. Edge `create-payment-session` → mã `PAY…` + VietQR
3. FE poll `sync-payment` mỗi 10s (gọi SePay API)
4. Webhook / poll khớp amount + nội dung `PAY…` → `complete_payment_session` → orders `completed` + enrollments
5. Hết TTL (5 phút) → `cancel_payment_session` → session `cancelled` + orders `cancelled`

## 6. Ghi chú

- Một lần thanh toán cho cả giỏ (tổng tiền các khóa trả phí).
- Không còn upload biên lai / GV duyệt tay.
- Dev: để trống cả `SEPAY_IPN_SECRET` và `SEPAY_WEBHOOK_HMAC_SECRET` thì webhook không kiểm auth (chỉ dùng local).
