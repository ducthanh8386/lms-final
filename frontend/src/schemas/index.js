import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự")
})

export const registerSchema = z.object({
  name: z.string().min(2, "Tên phải dài hơn 2 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự")
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

export const quizSchema = z.object({
  title: z.string().min(3, 'Tên quiz phải có ít nhất 3 ký tự'),
  description: z.string().optional(),
  time_limit_minutes: z.preprocess(
    val => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().positive('Thời gian làm bài phải là số dương').nullable().optional()
  ),
  max_attempts: z.preprocess(
    val => Number(val),
    z.number().int().min(1, 'Số lần thử tối thiểu là 1').default(1)
  ),
  passing_score: z.preprocess(
    val => Number(val),
    z.number().min(0, 'Điểm đạt tối thiểu là 0%').max(100, 'Điểm đạt tối đa là 100%').default(0)
  ),
  shuffle_questions: z.boolean().default(false),
  shuffle_options: z.boolean().default(false),
  show_result_immediately: z.boolean().default(true),
})

export const questionSchema = z.object({
  question_text: z.string().min(1, 'Câu hỏi không được để trống'),
  question_type: z.enum(['single', 'multiple', 'true_false']),
  points: z.number().positive('Điểm số phải lớn hơn 0').default(1),
  options: z.array(z.object({
    option_text: z.string().min(1, 'Đáp án không được để trống'),
    is_correct: z.boolean(),
  })).min(2, 'Cần ít nhất 2 đáp án')
    .refine(opts => opts.some(o => o.is_correct), 'Phải có ít nhất 1 đáp án đúng'),
})

export const classSchema = z.object({
  name: z.string().min(2, 'Tên lớp phải có ít nhất 2 ký tự'),
  description: z.string().optional(),
  max_students: z.number().int().min(1, 'Sĩ số tối thiểu là 1').max(200, 'Sĩ số tối đa là 200').default(50),
  course_id: z.string().uuid().optional().nullable(),
})

export const scheduleSchema = z.object({
  title: z.string().min(2, 'Tiêu đề phải có ít nhất 2 ký tự'),
  class_id: z.string().uuid().optional().nullable(),
  start_time: z.string().min(1, 'Chọn giờ bắt đầu'),
  end_time: z.string().min(1, 'Chọn giờ kết thúc'),
  location: z.string().optional(),
  meeting_url: z.string().url('URL họp không hợp lệ').optional().or(z.literal('')),
  recurrence_type: z.enum(['none', 'weekly']).default('none'),
  recurrence_days: z.array(z.number().int().min(0).max(6)).optional(),
  recurrence_end_date: z.string().optional(),
  color_tag: z.string().default('blue'),
}).refine(data => new Date(data.end_time) > new Date(data.start_time), {
  message: 'Giờ kết thúc phải sau giờ bắt đầu',
  path: ['end_time'],
})
