import React, { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { quizService } from '../../services/quizService'
import { courseService } from '../../services/courseService'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'
import { quizSchema, questionSchema } from '../../schemas'

const QuizManage = () => {
  const { courseId } = useParams()
  const toast = useToast()
  const { confirm } = useConfirm()

  const [quizzes, setQuizzes] = useState([])
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)

  // Quản lý trạng thái hiển thị
  const [activeTab, setActiveTab] = useState('list') // 'list' | 'quiz-form' | 'question-builder' | 'results'
  const [selectedQuiz, setSelectedQuiz] = useState(null)
  const [selectedResults, setSelectedResults] = useState([])
  const [loadingResults, setLoadingResults] = useState(false)

  // State Form Đề
  const [quizForm, setQuizForm] = useState({
    title: '',
    description: '',
    time_limit_minutes: '',
    max_attempts: 1,
    passing_score: 50,
    shuffle_questions: false,
    shuffle_options: false,
    show_result_immediately: true
  })
  const [savingQuiz, setSavingQuiz] = useState(false)
  const [quizValidationError, setQuizValidationError] = useState(null)

  // State Question Builder (Wizard)
  const [questions, setQuestions] = useState([])
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [questionForm, setQuestionForm] = useState({
    question_text: '',
    question_type: 'single', // 'single' | 'multiple' | 'true_false'
    points: 1,
    options: [
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false }
    ]
  })
  const [savingQuestion, setSavingQuestion] = useState(false)
  const [qValidationError, setQValidationError] = useState(null)

  const fetchCourseDetails = useCallback(async () => {
    const { data } = await courseService.getCourseDetail(courseId)
    if (data) setCourse(data)
  }, [courseId])

  const fetchQuizzes = useCallback(async () => {
    setLoading(true)
    const { data, error } = await quizService.getQuizzesByCourse(courseId)
    if (error) {
      toast.error("Lỗi tải đề trắc nghiệm: " + error.message)
    } else if (data) {
      setQuizzes(data)
    }
    setLoading(false)
  }, [courseId, toast])

  useEffect(() => {
    fetchCourseDetails()
    fetchQuizzes()
  }, [fetchCourseDetails, fetchQuizzes])

  const handleOpenCreateQuiz = () => {
    setSelectedQuiz(null)
    setQuizForm({
      title: '',
      description: '',
      time_limit_minutes: '',
      max_attempts: 1,
      passing_score: 50,
      shuffle_questions: false,
      shuffle_options: false,
      show_result_immediately: true
    })
    setQuizValidationError(null)
    setActiveTab('quiz-form')
  }

  const handleOpenEditQuiz = (quiz) => {
    setSelectedQuiz(quiz)
    setQuizForm({
      title: quiz.title,
      description: quiz.description || '',
      time_limit_minutes: quiz.time_limit_minutes || '',
      max_attempts: quiz.max_attempts || 1,
      passing_score: quiz.passing_score || 50,
      shuffle_questions: quiz.shuffle_questions || false,
      shuffle_options: quiz.shuffle_options || false,
      show_result_immediately: quiz.show_result_immediately || true
    })
    setQuizValidationError(null)
    setActiveTab('quiz-form')
  }

  const handleSaveQuiz = async (e) => {
    e.preventDefault()
    setSavingQuiz(true)
    setQuizValidationError(null)

    const payload = {
      title: quizForm.title,
      description: quizForm.description || undefined,
      time_limit_minutes: quizForm.time_limit_minutes ? Number(quizForm.time_limit_minutes) : null,
      max_attempts: Number(quizForm.max_attempts),
      passing_score: Number(quizForm.passing_score),
      shuffle_questions: quizForm.shuffle_questions,
      shuffle_options: quizForm.shuffle_options,
      show_result_immediately: quizForm.show_result_immediately
    }

    // Validate Zod
    const result = quizSchema.safeParse(payload)
    if (!result.success) {
      setQuizValidationError(result.error.errors[0].message)
      setSavingQuiz(false)
      return
    }

    let response
    if (selectedQuiz) {
      response = await quizService.updateQuiz(selectedQuiz.id, payload)
    } else {
      response = await quizService.createQuiz(courseId, payload)
    }

    if (response.error) {
      toast.error("Lỗi lưu đề: " + response.error.message)
    } else {
      toast.success("Lưu đề trắc nghiệm thành công!")
      fetchQuizzes()
      setActiveTab('list')
    }
    setSavingQuiz(false)
  }

  const handleDeleteQuiz = async (id) => {
    if (!(await confirm("Xác nhận xóa đề trắc nghiệm này cùng tất cả câu hỏi liên quan?"))) return

    const { error } = await quizService.deleteQuiz(id)
    if (error) {
      toast.error("Lỗi xóa đề: " + error.message)
    } else {
      toast.success("Xóa đề trắc nghiệm thành công!")
      fetchQuizzes()
    }
  }

  const handlePublishQuiz = async (quiz) => {
    if (!(await confirm(`Xác nhận xuất bản đề trắc nghiệm "${quiz.title}"? Học sinh sẽ có thể làm bài và nhận thông báo ngay.`))) return

    const { error } = await quizService.publishQuiz(quiz.id)
    if (error) {
      toast.error("Lỗi xuất bản: " + error.message)
    } else {
      toast.success("Xuất bản đề thi thành công!")
      fetchQuizzes()
    }
  }

  // == QUESTION BUILDER LOGIC ==
  const handleOpenQuestionBuilder = async (quiz) => {
    setSelectedQuiz(quiz)
    setLoading(true)
    const { data } = await quizService.getQuizWithQuestions(quiz.id)
    if (data) {
      setQuestions(data.questions || [])
    }
    setLoading(false)
    setActiveTab('question-builder')
    resetQuestionForm()
  }

  const resetQuestionForm = () => {
    setEditingQuestion(null)
    setQuestionForm({
      question_text: '',
      question_type: 'single',
      points: 1,
      options: [
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false }
      ]
    })
    setQValidationError(null)
  }

  const handleTypeChange = (type) => {
    let newOptions = []
    if (type === 'true_false') {
      newOptions = [
        { option_text: 'Đúng', is_correct: false },
        { option_text: 'Sai', is_correct: false }
      ]
    } else {
      newOptions = [
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false }
      ]
    }
    setQuestionForm(prev => ({
      ...prev,
      question_type: type,
      options: newOptions
    }))
  }

  const handleAddOptionField = () => {
    if (questionForm.options.length >= 6) {
      toast.error("Tối đa 6 đáp án")
      return
    }
    setQuestionForm(prev => ({
      ...prev,
      options: [...prev.options, { option_text: '', is_correct: false }]
    }))
  }

  const handleRemoveOptionField = (idx) => {
    if (questionForm.options.length <= 2) {
      toast.error("Cần ít nhất 2 đáp án")
      return
    }
    setQuestionForm(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== idx)
    }))
  }

  const handleOptionChange = (idx, field, value) => {
    setQuestionForm(prev => {
      const opts = prev.options.map((opt, i) => {
        if (i === idx) {
          return { ...opt, [field]: value }
        }
        // Đối với câu hỏi single hoặc true_false, chỉ cho phép duy nhất 1 đáp án đúng
        if (field === 'is_correct' && value === true && (prev.question_type === 'single' || prev.question_type === 'true_false')) {
          return { ...opt, is_correct: false }
        }
        return opt
      })
      return { ...prev, options: opts }
    })
  }

  const handleSaveQuestion = async (e) => {
    e.preventDefault()
    setSavingQuestion(true)
    setQValidationError(null)

    // Zod validation
    const payload = {
      question_text: questionForm.question_text,
      question_type: questionForm.question_type,
      points: Number(questionForm.points),
      options: questionForm.options.map(opt => ({
        option_text: opt.option_text,
        is_correct: opt.is_correct
      }))
    }

    const result = questionSchema.safeParse(payload)
    if (!result.success) {
      setQValidationError(result.error.errors[0].message)
      setSavingQuestion(false)
      return
    }

    let response
    if (editingQuestion) {
      response = await quizService.updateQuestion(editingQuestion.id, {
        question_text: payload.question_text,
        question_type: payload.question_type,
        points: payload.points
      }, payload.options)
    } else {
      response = await quizService.addQuestion(selectedQuiz.id, {
        question_text: payload.question_text,
        question_type: payload.question_type,
        points: payload.points
      }, payload.options)
    }

    if (response.error) {
      toast.error("Lỗi lưu câu hỏi: " + response.error.message)
    } else {
      toast.success("Lưu câu hỏi thành công!")
      // Reload danh sách câu hỏi
      const { data } = await quizService.getQuizWithQuestions(selectedQuiz.id)
      if (data) setQuestions(data.questions || [])
      resetQuestionForm()
    }
    setSavingQuestion(false)
  }

  const handleEditQuestionClick = (q) => {
    setEditingQuestion(q)
    setQuestionForm({
      question_text: q.question_text,
      question_type: q.question_type,
      points: q.points || 1,
      options: q.options.map(opt => ({
        option_text: opt.option_text,
        is_correct: opt.is_correct
      }))
    })
  }

  const handleDeleteQuestion = async (id) => {
    if (!(await confirm("Xác nhận xóa câu hỏi này?"))) return

    const { error } = await quizService.deleteQuestion(id)
    if (error) {
      toast.error("Lỗi xóa: " + error.message)
    } else {
      toast.success("Xóa câu hỏi thành công!")
      const { data } = await quizService.getQuizWithQuestions(selectedQuiz.id)
      if (data) setQuestions(data.questions || [])
    }
  }

  // == RESULTS VIEW LOGIC ==
  const handleOpenResults = async (quiz) => {
    setSelectedQuiz(quiz)
    setLoadingResults(true)
    setActiveTab('results')
    const { data, error } = await quizService.getQuizAttemptsForTeacher(quiz.id)
    if (error) {
      toast.error("Không tải được bảng điểm: " + error.message)
    } else if (data) {
      setSelectedResults(data)
    }
    setLoadingResults(false)
  }

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8 text-left bg-slate-50 min-h-screen">
      <header className="mb-6">
        <Link to={`/teacher/courses/${courseId}/lessons`} className="text-sm font-medium text-slate-500 hover:text-accent">&larr; Quay lại danh sách bài học</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Quản Lý Trắc Nghiệm</h1>
        {course && <p className="text-slate-500 text-sm">Khóa học: {course.title}</p>}
      </header>

      {/* TABS CONTROLLER */}
      {activeTab === 'list' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
            <h3 className="font-bold text-slate-900">Danh sách các bài trắc nghiệm</h3>
            <button
              onClick={handleOpenCreateQuiz}
              className="rounded bg-accent px-4 py-2 text-xs font-bold text-white hover:bg-purple-600 transition"
            >
              + Tạo Quiz Mới
            </button>
          </div>

          {loading ? (
            <div className="h-44 w-full bg-white border rounded-xl animate-pulse" />
          ) : quizzes.length > 0 ? (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-4 font-semibold text-slate-600">Đề trắc nghiệm</th>
                    <th className="p-4 font-semibold text-slate-600">Thời gian</th>
                    <th className="p-4 font-semibold text-slate-600">Lượt làm</th>
                    <th className="p-4 font-semibold text-slate-600">Trạng thái</th>
                    <th className="p-4 font-semibold text-slate-600 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {quizzes.map(quiz => (
                    <tr key={quiz.id} className="hover:bg-slate-50/50">
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{quiz.title}</div>
                        <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{quiz.description || 'Không có mô tả'}</div>
                      </td>
                      <td className="p-4 text-slate-600 text-xs">
                        {quiz.time_limit_minutes ? `${quiz.time_limit_minutes} phút` : 'Không giới hạn'}
                      </td>
                      <td className="p-4 text-slate-600 text-xs">
                        Tối đa {quiz.max_attempts} lần
                      </td>
                      <td className="p-4">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${quiz.is_published ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>
                          {quiz.is_published ? 'Đã xuất bản' : 'Bản nháp'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-3">
                          <button onClick={() => handleOpenQuestionBuilder(quiz)} className="text-xs font-bold text-accent hover:underline">
                            Bộ câu hỏi
                          </button>
                          <button onClick={() => handleOpenResults(quiz)} className="text-xs font-bold text-slate-600 hover:underline">
                            Kết quả
                          </button>
                          <button onClick={() => handleOpenEditQuiz(quiz)} className="text-xs font-bold text-slate-600 hover:underline">
                            Sửa
                          </button>
                          {!quiz.is_published && (
                            <button onClick={() => handlePublishQuiz(quiz)} className="text-xs font-bold text-green-600 hover:underline">
                              Xuất bản
                            </button>
                          )}
                          <button onClick={() => handleDeleteQuiz(quiz.id)} className="text-xs font-bold text-red-600 hover:underline">
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed bg-white p-12 text-center text-slate-500">
              Chưa có đề trắc nghiệm nào trong khóa học này.
            </div>
          )}
        </div>
      )}

      {/* TAB CREATE / EDIT QUIZ */}
      {activeTab === 'quiz-form' && (
        <form onSubmit={handleSaveQuiz} className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-slate-900 border-b pb-2 mb-2">
            {selectedQuiz ? 'Cập nhật đề trắc nghiệm' : 'Tạo đề trắc nghiệm mới'}
          </h3>

          {quizValidationError && (
            <div className="rounded bg-red-50 p-3 text-sm text-red-600 font-medium">{quizValidationError}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tiêu đề đề thi *</label>
              <input
                type="text"
                required
                value={quizForm.title}
                onChange={e => setQuizForm({...quizForm, title: e.target.value})}
                className="w-full rounded-md border p-2 focus:border-accent focus:outline-none text-sm text-slate-800"
                placeholder="VD: Kiểm tra giữa kỳ môn Tiếng Anh"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Thời gian làm bài (Phút)</label>
              <input
                type="number"
                min="1"
                placeholder="Để trống = Không giới hạn"
                value={quizForm.time_limit_minutes}
                onChange={e => setQuizForm({...quizForm, time_limit_minutes: e.target.value})}
                className="w-full rounded-md border p-2 focus:border-accent focus:outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả chi tiết</label>
            <textarea
              value={quizForm.description}
              onChange={e => setQuizForm({...quizForm, description: e.target.value})}
              rows="3"
              className="w-full rounded-md border p-2 focus:border-accent focus:outline-none text-sm"
              placeholder="Ghi chú, điều khoản làm đề..."
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Số lượt thi tối đa</label>
              <input
                type="number"
                min="1"
                required
                value={quizForm.max_attempts}
                onChange={e => setQuizForm({...quizForm, max_attempts: e.target.value})}
                className="w-full rounded-md border p-2 focus:border-accent focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Điểm tối thiểu đạt (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                required
                value={quizForm.passing_score}
                onChange={e => setQuizForm({...quizForm, passing_score: e.target.value})}
                className="w-full rounded-md border p-2 focus:border-accent focus:outline-none text-sm"
              />
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            <h4 className="font-bold text-slate-800 text-sm mb-2">Cấu hình thêm:</h4>
            
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={quizForm.shuffle_questions}
                  onChange={e => setQuizForm({...quizForm, shuffle_questions: e.target.checked})}
                  className="rounded text-accent focus:ring-accent"
                />
                Trộn ngẫu nhiên câu hỏi khi học sinh làm bài
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={quizForm.shuffle_options}
                  onChange={e => setQuizForm({...quizForm, shuffle_options: e.target.checked})}
                  className="rounded text-accent focus:ring-accent"
                />
                Trộn ngẫu nhiên đáp án khi học sinh làm bài
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={quizForm.show_result_immediately}
                  onChange={e => setQuizForm({...quizForm, show_result_immediately: e.target.checked})}
                  className="rounded text-accent focus:ring-accent"
                />
                Cho học sinh xem kết quả ngay sau khi nộp bài
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className="rounded px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={savingQuiz}
              className="rounded bg-accent px-5 py-2 text-xs font-bold text-white hover:bg-purple-600 disabled:opacity-50"
            >
              {savingQuiz ? 'Đang lưu...' : 'Lưu thông tin đề'}
            </button>
          </div>
        </form>
      )}

      {/* TAB QUESTION BUILDER */}
      {activeTab === 'question-builder' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Cột trái: Form tạo câu hỏi */}
          <div className="md:col-span-2">
            <form onSubmit={handleSaveQuestion} className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-bold text-slate-900">
                  {editingQuestion ? 'Cập nhật câu hỏi' : 'Thêm câu hỏi mới'}
                </h3>
                {editingQuestion && (
                  <button type="button" onClick={resetQuestionForm} className="text-xs text-accent font-bold hover:underline">
                    Tạo mới &rarr;
                  </button>
                )}
              </div>

              {qValidationError && (
                <div className="rounded bg-red-50 p-3 text-xs text-red-600 font-medium">{qValidationError}</div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nội dung câu hỏi *</label>
                <textarea
                  required
                  rows="3"
                  value={questionForm.question_text}
                  onChange={e => setQuestionForm({...questionForm, question_text: e.target.value})}
                  className="w-full rounded-md border p-2 focus:border-accent focus:outline-none text-sm text-slate-800"
                  placeholder="Nhập nội dung câu hỏi..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Loại câu hỏi</label>
                  <select
                    value={questionForm.question_type}
                    onChange={e => handleTypeChange(e.target.value)}
                    className="w-full rounded-md border p-2 bg-white text-xs focus:border-accent focus:outline-none text-slate-700 font-semibold"
                  >
                    <option value="single">Một đáp án đúng (Radio)</option>
                    <option value="multiple">Nhiều đáp án đúng (Checkbox)</option>
                    <option value="true_false">Đúng / Sai</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Điểm số</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    value={questionForm.points}
                    onChange={e => setQuestionForm({...questionForm, points: e.target.value})}
                    className="w-full rounded-md border p-2 text-xs focus:border-accent focus:outline-none font-semibold text-slate-700"
                  />
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-800 text-xs">Danh sách đáp án</h4>
                  {questionForm.question_type !== 'true_false' && (
                    <button
                      type="button"
                      onClick={handleAddOptionField}
                      className="text-xs font-bold text-accent hover:underline"
                    >
                      + Thêm lựa chọn
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {questionForm.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      {/* Checkbox / Radio chọn đúng */}
                      <input
                        type={questionForm.question_type === 'multiple' ? 'checkbox' : 'radio'}
                        name="correct_option"
                        checked={opt.is_correct}
                        onChange={e => handleOptionChange(idx, 'is_correct', e.target.checked)}
                        className="rounded text-accent focus:ring-accent cursor-pointer"
                      />
                      
                      {/* Ô nhập nội dung đáp án */}
                      <input
                        type="text"
                        required
                        value={opt.option_text}
                        disabled={questionForm.question_type === 'true_false'}
                        onChange={e => handleOptionChange(idx, 'option_text', e.target.value)}
                        className="flex-1 rounded border p-2 text-xs focus:border-accent focus:outline-none text-slate-700 font-medium"
                        placeholder={`Lựa chọn ${idx + 1}...`}
                      />

                      {/* Nút xóa lựa chọn */}
                      {questionForm.question_type !== 'true_false' && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOptionField(idx)}
                          className="text-slate-400 hover:text-red-500 font-bold"
                          title="Xóa lựa chọn này"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="submit"
                  disabled={savingQuestion}
                  className="rounded bg-accent px-5 py-2 text-xs font-bold text-white hover:bg-purple-600 disabled:opacity-50"
                >
                  {savingQuestion ? 'Đang lưu...' : 'Lưu câu hỏi'}
                </button>
              </div>
            </form>
          </div>

          {/* Cột phải: List câu hỏi hiện tại */}
          <div className="space-y-4">
            <div className="rounded-xl border bg-white p-4 shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-center border-b pb-2">
                <h4 className="font-bold text-slate-800 text-sm">Bộ câu hỏi ({questions.length})</h4>
                <button onClick={() => setActiveTab('list')} className="text-xs font-semibold text-slate-500 hover:underline">
                  Xong &larr;
                </button>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-0.5 divide-y divide-slate-100">
                {questions.map((q, idx) => (
                  <div key={q.id} className="pt-3 first:pt-0">
                    <div className="flex justify-between items-start gap-2">
                      <div className="font-bold text-slate-800 text-xs leading-normal">
                        Câu {idx + 1}: {q.question_text}
                      </div>
                      <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-semibold shrink-0">
                        {q.points}đ
                      </span>
                    </div>

                    <ul className="mt-2 pl-4 list-disc text-slate-500 text-[11px] space-y-1">
                      {q.options?.map(opt => (
                        <li key={opt.id} className={opt.is_correct ? 'text-green-600 font-semibold' : ''}>
                          {opt.option_text} {opt.is_correct && '✓'}
                        </li>
                      ))}
                    </ul>

                    <div className="flex justify-end gap-2 mt-2">
                      <button onClick={() => handleEditQuestionClick(q)} className="text-[10px] font-bold text-accent hover:underline">
                        Sửa
                      </button>
                      <button onClick={() => handleDeleteQuestion(q.id)} className="text-[10px] font-bold text-red-500 hover:underline">
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}
                {questions.length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-12">Chưa có câu hỏi nào được thêm.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB RESULTS (STUDENT GRADES) */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
            <h3 className="font-bold text-slate-900">Bảng điểm thi: {selectedQuiz?.title}</h3>
            <button
              onClick={() => setActiveTab('list')}
              className="text-xs font-semibold text-slate-500 hover:underline"
            >
              Quay lại danh sách &rarr;
            </button>
          </div>

          {loadingResults ? (
            <div className="h-44 w-full bg-white border rounded-xl animate-pulse" />
          ) : selectedResults.length > 0 ? (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full min-w-[500px] text-left text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-4 font-semibold text-slate-600">Học sinh</th>
                    <th className="p-4 font-semibold text-slate-600">Điểm thi</th>
                    <th className="p-4 font-semibold text-slate-600">Thời gian làm</th>
                    <th className="p-4 font-semibold text-slate-600">Ngày nộp</th>
                    <th className="p-4 font-semibold text-slate-600">Kết quả</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {selectedResults.map(res => {
                    const isPassed = res.score >= (selectedQuiz?.passing_score || 0)
                    return (
                      <tr key={res.id} className="hover:bg-slate-50/50">
                        <td className="p-4 font-bold text-slate-800">
                          {res.profiles?.name || 'Học viên'}
                          <div className="text-[10px] text-slate-400 font-medium">Lần thứ {res.attempt_number}</div>
                        </td>
                        <td className="p-4 font-black text-slate-900">
                          {res.score}%
                        </td>
                        <td className="p-4 text-slate-600 text-xs">
                          {res.time_taken_seconds ? `${Math.floor(res.time_taken_seconds / 60)} phút ${res.time_taken_seconds % 60} giây` : 'N/A'}
                        </td>
                        <td className="p-4 text-slate-500 text-xs">
                          {new Date(res.submitted_at).toLocaleString()}
                        </td>
                        <td className="p-4">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${isPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {isPassed ? 'Đạt' : 'Chưa Đạt'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed bg-white p-12 text-center text-slate-400 italic">
              Chưa có học sinh nào nộp bài thi trắc nghiệm này.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default QuizManage
