---
name: LMS Marketplace
description: Design system inspired by F8 (fullstack.edu.vn) — LMS học lập trình / khóa học online
colors:
  surface: "#F5F5F5"
  surface-dim: "#E8E8E8"
  surface-bright: "#FFFFFF"
  surface-container-lowest: "#FFFFFF"
  surface-container-low: "#FAFAFA"
  surface-container: "#F0F0F0"
  surface-container-high: "#E8E8E8"
  surface-container-highest: "#D4D4D4"
  on-surface: "#242424"
  on-surface-variant: "#666666"
  inverse-surface: "#1A1A1A"
  inverse-on-surface: "#F5F5F5"
  outline: "#DBDBDB"
  outline-variant: "#E8E8E8"
  surface-tint: "#F05123"
  primary: "#F05123"
  on-primary: "#FFFFFF"
  primary-container: "#FFE8E0"
  on-primary-container: "#8A2A0E"
  inverse-primary: "#FF8A65"
  secondary: "#292929"
  on-secondary: "#FFFFFF"
  secondary-container: "#3D3D3D"
  on-secondary-container: "#E0E0E0"
  tertiary: "#1473E6"
  on-tertiary: "#FFFFFF"
  tertiary-container: "#E3F0FF"
  on-tertiary-container: "#0B4A99"
  error: "#E53935"
  on-error: "#FFFFFF"
  error-container: "#FFEBEE"
  on-error-container: "#B71C1C"
  primary-fixed: "#FFCCBC"
  primary-fixed-dim: "#FF8A65"
  on-primary-fixed: "#3E1005"
  on-primary-fixed-variant: "#8A2A0E"
  secondary-fixed: "#E0E0E0"
  secondary-fixed-dim: "#9E9E9E"
  on-secondary-fixed: "#000000"
  on-secondary-fixed-variant: "#292929"
  background: "#FFFFFF"
  on-background: "#242424"
  surface-variant: "#F0F0F0"
typography:
  display:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: "800"
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: "700"
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: "700"
    lineHeight: 30px
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: "600"
    lineHeight: 26px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 26px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 22px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: "600"
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: "600"
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.5rem
  DEFAULT: 0.75rem
  md: 0.75rem
  lg: 1rem
  xl: 1rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 20px
  lg: 32px
  xl: 48px
  gutter: 20px
  margin: 24px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.lg}"
    padding: 12px
    height: 40px
  button-primary-hover:
    backgroundColor: "#D63F15"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: transparent
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.lg}"
    padding: 12px
    height: 40px
  button-secondary-hover:
    backgroundColor: "{colors.surface-container-low}"
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.lg}"
    padding: 12px
  card:
    backgroundColor: "{colors.surface-container-lowest}"
    rounded: "{rounded.xl}"
    padding: "{spacing.md}"
  card-course:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.md}"
  card-course-hover:
    backgroundColor: "{colors.surface-container-lowest}"
  card-stat:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.sm}"
  input-field:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: 10px
  sidebar-banner:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.xl}"
    padding: "{spacing.lg}"
  nav-sidebar:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.on-surface}"
    padding: "{spacing.md}"
  nav-item-active:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: 10px
  list-item:
    backgroundColor: transparent
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
  list-item-hover:
    backgroundColor: "{colors.surface-container}"
  badge-status:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.on-primary-container}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: 4px
  badge-success:
    backgroundColor: "#E8F5E9"
    textColor: "#2E7D32"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: 4px
  badge-vip:
    backgroundColor: "{colors.tertiary-container}"
    textColor: "{colors.on-tertiary-container}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: 4px
---

## Brand & Style

**LMS Marketplace** lấy cảm hứng từ **F8 (fullstack.edu.vn)** — nền tảng học lập trình thân thiện, rõ ràng, tập trung học viên.

Phong cách: **F8 Learning Clean**. Nền trắng / xám rất nhạt; primary đỏ cam `#F05123` (signature F8); chữ đậm `#242424`; phụ `#666`. Cảm giác gần gũi, năng lượng học tập — không “studio premium ấm”, không SaaS tím/indigo.

Slogan cảm xúc: **Học để đi làm** — CTA rõ, lộ trình rõ, card khóa học dễ quét.

## Colors

- **Primary (#F05123):** CTA — "Học ngay", "Thêm vào giỏ", "Đăng nhập", progress bar. Một primary / viewport.
- **Primary hover (#D63F15):** Hover / active button.
- **Background (#FFFFFF / #F5F5F5):** Trang trắng; vùng list/dashboard dùng `#F5F5F5`.
- **On-surface (#242424):** Tiêu đề, tên khóa học — đậm, dễ đọc.
- **Muted (#666666):** Meta (giảng viên, số bài, mô tả ngắn).
- **Tertiary (#1473E6):** Link phụ, badge thông tin — không tranh với cam.
- **Outline (#DBDBDB):** Viền card / input mỏng, sạch.

## Typography

Một font chính (giống F8 — clean sans):

- **Inter** cho mọi thứ: headline đậm 700–800, body 400–500, label 600.
- Hero: `display` hoặc `headline-lg`, tracking hơi âm.
- Tên khóa trên card: `title-lg` / `headline-md`, line-clamp 2.
- Meta: `body-md` màu muted.

## Layout & Spacing

Mobile-first. Content max ~1200–1280px.

| Vùng | Quy tắc (kiểu F8) |
|------|-------------------|
| Header | Trắng, sticky; logo trái; nav / search giữa–phải; avatar / CTA phải |
| Home | Hero sáng (không dark forest); section "Khóa học nổi bật" + grid card |
| Browse | Nền `#F5F5F5`; filter + grid `1 → 2 → 3 → 4` |
| Learning | Sidebar danh sách bài (trái) + player / nội dung (phải); bài active highlight cam nhạt |
| Auth | Form giữa, card trắng shadow nhẹ, CTA full-width cam |
| Teacher/Admin | Top nav hoặc sidebar trắng; content trên nền xám nhạt |

## Elevation & Depth

Shadow **rất nhẹ** (F8-like), không glassmorphism.

| Level | Dùng cho | Style |
|-------|----------|-------|
| 0 | Page | Trắng / `#F5F5F5`, không shadow |
| 1 | Course card | `0 2px 8px rgba(0,0,0,0.06)` hoặc border `#DBDBDB` |
| 2 | Dropdown, modal | `0 8px 24px rgba(0,0,0,0.12)` |
| Hover card | Dịch nhẹ lên + shadow tăng nhẹ | `translateY(-2px)` |

Button primary: hover tối màu, transition ~150ms.

## Shapes

Bo góc **vừa–mềm** (F8):

- Button / input: `rounded-lg` (~8–16px)
- Card khóa học: `rounded-xl` (~16px)
- Avatar / badge: `rounded-full`
- Thumbnail: `rounded-xl` top, aspect ~16/9
- Progress bar: `rounded-full`, fill `primary`

## Components

### Buttons

| Variant | Khi nào | Style |
|---------|---------|-------|
| Primary | 1 CTA chính | `#F05123`, chữ trắng, h-10 / h-11 |
| Secondary | Hủy / phụ | Viền `#DBDBDB`, nền trắng |
| Ghost | Link | Chữ `primary`, không nền |

### Cards (`card-course`)

- Thumbnail trên, content dưới (title → meta → progress / giá)
- Progress bar cam nếu đang học
- Hover: shadow nhẹ + lift 2px
- Không overlay badge rối trên ảnh (badge nhỏ góc hoặc dưới title)

### Inputs

- Nền trắng, border `#DBDBDB`, `rounded-lg`
- Focus: border / ring `primary`
- Label: `label-md`, không bắt buộc uppercase dày như studio

### Navigation

- Header trắng sticky, border-bottom mỏng
- Logo + tên sản phẩm (cam hoặc chữ đậm)
- Item active: chữ `primary` hoặc nền `primary-container`
- Learning sidebar: item active = nền `#FFE8E0` + chữ `#F05123` + stripe trái cam

### Badges

| Badge | Màu | Dùng cho |
|-------|-----|----------|
| badge-status | Cam nhạt | Pending, đang học |
| badge-success | Xanh mint | Hoàn thành, approved |
| badge-vip | Xanh dương nhạt | Pro / nổi bật |

## Roles & Surfaces

| Role | Surface | Ghi chú |
|------|---------|---------|
| Student | Home, courses, learning | F8-first: browse + học |
| Teacher | Quản lý khóa / bài / chấm | Cùng token, mật độ form cao hơn |
| Admin | Duyệt / users / stats | Badge trạng thái rõ |

## Do's and Don'ts

- **Do** dùng `#F05123` làm primary duy nhất.
- **Do** giữ nền trắng / xám nhạt — cảm giác F8 sạch.
- **Do** card khóa học: ảnh + title + meta + progress/giá.
- **Do** sync `DESIGN.md` ↔ `index.css` / `variables.css`.
- **Don't** dùng tím indigo cũ hay linen/forest “Warm Studio”.
- **Don't** hero tối xanh rừng (đã bỏ) — F8 nghiêng sáng / friendly.
- **Don't** nhiều CTA cam trên một màn.
- **Don't** hardcode hex trong component khi đã có token.
