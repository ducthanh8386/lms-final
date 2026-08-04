import { supabase } from '../lib/supabaseClient'
import { notificationService } from './notificationService'

// Hàm đảo lộn ngẫu nhiên với seed (thuật toán Fisher-Yates kết hợp seeded random từ attempt_id)
export function seededShuffle(array, seed) {
  if (!seed) return [...array]
  let hashCode = 0
  for (let i = 0; i < seed.length; i++) {
    hashCode = seed.charCodeAt(i) + ((hashCode << 5) - hashCode)
  }
  
  const random = () => {
    const x = Math.sin(hashCode++) * 10000
    return x - Math.floor(x)
  }

  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const temp = arr[i]
    arr[i] = arr[j]
    arr[j] = temp
  }
  return arr
}

export const quizService = {
  // === CHO GIÁO VIÊN ===

  // Tạo đề trắc nghiệm mới
  async createQuiz(courseId, quizData) {
    const { data, error } = await supabase
      .from('quizzes')
      .insert([{
        ...quizData,
        course_id: courseId,
        is_published: false
      }])
      .select()
      .single()
    return { data, error }
  },

  // Cập nhật thông tin đề
  async updateQuiz(quizId, quizData) {
    const { data, error } = await supabase
      .from('quizzes')
      .update({
        ...quizData,
        updated_at: new Date().toISOString()
      })
      .eq('id', quizId)
      .select()
      .single()
    return { data, error }
  },

  // Xóa đề trắc nghiệm
  async deleteQuiz(quizId) {
    const { data, error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', quizId)
    return { data, error }
  },

  // Thêm câu hỏi và các đáp án đi kèm
  async addQuestion(quizId, questionData, options) {
    // 1. Lấy order_index lớn nhất hiện tại
    const { data: existingQ } = await supabase
      .from('quiz_questions')
      .select('order_index')
      .eq('quiz_id', quizId)
      .order('order_index', { ascending: false })
      .limit(1)

    const nextIndex = existingQ && existingQ.length > 0 ? existingQ[0].order_index + 1 : 1

    // 2. Chèn câu hỏi
    const { data: question, error: questionErr } = await supabase
      .from('quiz_questions')
      .insert([{
        ...questionData,
        quiz_id: quizId,
        order_index: nextIndex
      }])
      .select()
      .single()

    if (questionErr) return { error: questionErr }

    // 3. Chèn đáp án
    const optionsToInsert = options.map((opt, idx) => ({
      question_id: question.id,
      option_text: opt.option_text,
      is_correct: opt.is_correct,
      order_index: idx + 1
    }))

    const { error: optionsErr } = await supabase
      .from('quiz_options')
      .insert(optionsToInsert)

    if (optionsErr) {
      // Hủy câu hỏi nếu chèn đáp án lỗi
      await supabase.from('quiz_questions').delete().eq('id', question.id)
      return { error: optionsErr }
    }

    return { data: question, error: null }
  },

  // Cập nhật câu hỏi và các đáp án
  async updateQuestion(questionId, questionData, options) {
    // 1. Cập nhật câu hỏi
    const { data: question, error: questionErr } = await supabase
      .from('quiz_questions')
      .update(questionData)
      .eq('id', questionId)
      .select()
      .single()

    if (questionErr) return { error: questionErr }

    // 2. Xóa các đáp án cũ
    const { error: deleteErr } = await supabase
      .from('quiz_options')
      .delete()
      .eq('question_id', questionId)

    if (deleteErr) return { error: deleteErr }

    // 3. Chèn các đáp án mới
    const optionsToInsert = options.map((opt, idx) => ({
      question_id: questionId,
      option_text: opt.option_text,
      is_correct: opt.is_correct,
      order_index: idx + 1
    }))

    const { error: optionsErr } = await supabase
      .from('quiz_options')
      .insert(optionsToInsert)

    return { data: question, error: optionsErr }
  },

  // Xóa câu hỏi
  async deleteQuestion(questionId) {
    const { data, error } = await supabase
      .from('quiz_questions')
      .delete()
      .eq('id', questionId)
    return { data, error }
  },

  // Lấy chi tiết đề kèm toàn bộ câu hỏi và đáp án
  async getQuizWithQuestions(quizId) {
    // Lấy đề
    const { data: quiz, error: quizErr } = await supabase
      .from('quizzes')
      .select('*, courses(title)')
      .eq('id', quizId)
      .single()

    if (quizErr) return { error: quizErr }

    // Lấy toàn bộ câu hỏi
    const { data: questions, error: questionsErr } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('order_index', { ascending: true })

    if (questionsErr) return { error: questionsErr }

    if (!questions || questions.length === 0) {
      return { data: { ...quiz, questions: [] }, error: null }
    }

    const questionIds = questions.map(q => q.id)

    // Lấy đáp án
    const { data: options, error: optionsErr } = await supabase
      .from('quiz_options')
      .select('*')
      .in('question_id', questionIds)
      .order('order_index', { ascending: true })

    if (optionsErr) return { error: optionsErr }

    // Gán đáp án vào từng câu tương ứng
    const questionsWithOptions = questions.map(q => ({
      ...q,
      options: options?.filter(opt => opt.question_id === q.id) || []
    }))

    return {
      data: {
        ...quiz,
        questions: questionsWithOptions
      },
      error: null
    }
  },

  // Xuất bản đề và bắn thông báo tự động cho toàn bộ học sinh trong khóa
  async publishQuiz(quizId) {
    const { data: quiz, error: quizErr } = await supabase
      .from('quizzes')
      .update({ is_published: true })
      .eq('id', quizId)
      .select('*, courses(title)')
      .single()

    if (quizErr) return { error: quizErr }

    // Bắn thông báo tự động cho các học viên học khóa học này
    try {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('user_id')
        .eq('course_id', quiz.course_id)

      if (enrollments && enrollments.length > 0) {
        for (const enroll of enrollments) {
          await notificationService.createNotification(
            enroll.user_id,
            'quiz_available',
            `Đề trắc nghiệm mới: ${quiz.title}`,
            `Khóa học "${quiz.courses?.title || 'Khóa học'}" đã cập nhật bài trắc nghiệm mới. Hãy vào thi ngay!`,
            quizId,
            'quiz'
          )
        }
      }
    } catch (err) {
      console.error("Gửi thông báo có bài trắc nghiệm mới lỗi:", err)
    }

    return { data: quiz, error: null }
  },

  // === CHO HỌC VIÊN ===

  // Bắt đầu một lượt thi trắc nghiệm mới
  async startAttempt(quizId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: { message: "Chưa đăng nhập" } }

    // Đếm số lượt đã thi để tính số lần thử tiếp theo
    const { count, error: countErr } = await supabase
      .from('quiz_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('quiz_id', quizId)
      .eq('student_id', user.id)

    if (countErr) return { error: countErr }

    const attemptNumber = (count || 0) + 1

    const { data, error } = await supabase
      .from('quiz_attempts')
      .insert([{
        quiz_id: quizId,
        student_id: user.id,
        attempt_number: attemptNumber,
        started_at: new Date().toISOString()
      }])
      .select()
      .single()

    return { data, error }
  },

  // Chấm điểm lượt thi (Bảo mật qua RPC Database)
  async submitAttempt(attemptId, answers) {
    // answers: [{ questionId, selectedOptionIds: [] }]
    const { data, error } = await supabase.rpc('submit_quiz_attempt', {
      p_attempt_id: attemptId,
      p_answers: answers,
    })
    return { data, error }
  },

  // Xem kết quả lượt thi chi tiết
  async getAttemptResult(attemptId) {
    const { data: attempt, error: attemptErr } = await supabase
      .from('quiz_attempts')
      .select('*, quizzes(*)')
      .eq('id', attemptId)
      .single()

    if (attemptErr) return { error: attemptErr }

    const { data: answers, error: answersErr } = await supabase
      .from('quiz_answers')
      .select('*, quiz_questions(*, quiz_options(*))')
      .eq('attempt_id', attemptId)

    if (answersErr) return { error: answersErr }

    return {
      data: {
        attempt,
        answers: answers || []
      }
    }
  },

  // Xem lịch sử các lượt thi của học viên đối với đề
  async getStudentAttempts(quizId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: { message: "Chưa đăng nhập" } }

    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('student_id', user.id)
      .order('attempt_number', { ascending: false })

    return { data, error }
  },

  // Lấy các lượt thi của cả lớp (cho Giáo viên)
  async getQuizAttemptsForTeacher(quizId) {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*, profiles:student_id(name, email)')
      .eq('quiz_id', quizId)
      .order('submitted_at', { ascending: false })

    return { data, error }
  },

  // Lấy danh sách đề trắc nghiệm của khóa học
  async getQuizzesByCourse(courseId) {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })
    return { data, error }
  }
}
