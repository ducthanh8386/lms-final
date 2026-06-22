import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự")
})

export const registerSchema = z.object({
  name: z.string().min(2, "Tên phải dài hơn 2 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự")
})

export const courseSchema = z.object({
  title: z.string().min(5, "Tên khóa học phải dài hơn 5 ký tự").max(100, "Tên quá dài"),
  description: z.string().optional(),
  price: z.number().min(0, "Giá không được âm").default(0),
  is_free: z.boolean().default(false),
  category_id: z.string().min(1, "Vui lòng chọn danh mục")
})

export const lessonSchema = z.object({
  title: z.string().min(3, "Tên bài học phải dài hơn 3 ký tự"),
  content_type: z.enum(['video', 'text']),
  content: z.string().min(1, "Nội dung không được để trống"),
  order_index: z.number().min(0).default(0)
})

export const assignmentSchema = z.object({
  title: z.string().min(3, "Tên bài tập phải dài hơn 3 ký tự"),
  description: z.string().optional(),
  due_date: z.string().optional()
})
