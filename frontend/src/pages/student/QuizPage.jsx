import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { quizService, seededShuffle } from '../../services/quizService'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'

const QuizPage = () => {
  const { courseId, quizId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { confirm } = useConfirm()
  const { user } = useAuth()

  // Trạng thái chung
  const [loading, setLoading] = useState(true)
  const [quiz, setQuiz] = useState(null)
  const [attempts, setAttempts] = useState([])
  const [viewState, setViewState] = useState('intro') // 'intro' | 'active' | 'result'
  
  // Trạng thái active quiz
  const [currentAttempt, setCurrentAttempt] = useState(null)
  const [shuffledQuestions, setShuffledQuestions] = useState([])
  const [currentQIndex, setCurrentQIndex] = useState(0)
  
  // Lưu câu trả lời dưới dạng: { questionId: [selectedOptionIds] }
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(0) // Giây
  const [submitting, setSubmitting] = useState(false)

  // Trạng thái xem kết quả chi tiết
  const [finishedResult, setFinishedResult] = useState(null)

  const fetchQuizData = useCallback(async () => {
    setLoading(true)
    const { data: qData, error: qErr } = await quizService.getQuizWithQuestions(quizId)
    if (qErr) {
      toast.error("Không tải được đề thi: " + qErr.message)
      navigate(`/learning/${courseId}`)
      return
    }
    setQuiz(qData)

    const { data: attList } = await quizService.getStudentAttempts(quizId)
    if (attList) setAttempts(attList)
    
    setLoading(false)
  }, [courseId, quizId, toast, navigate])

  useEffect(() => {
    if (user) {
      fetchQuizData()
    }
  }, [user, fetchQuizData])

  // Countdown timer logic
  useEffect(() => {
    if (viewState !== 'active' || timeLeft <= 0) {
      if (viewState === 'active' && timeLeft === 0) {
        handleAutoSubmit()
      }
      return
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [viewState, timeLeft])

  const handleStartAttempt = async () => {
    if (!quiz) return

    // Kiểm tra số lượt thi giới hạn
    if (attempts.length >= quiz.max_attempts) {
      toast.error("Bạn đã hết lượt thi cho bài này.")
      return
    }

    if (!(await confirm(`Bắt đầu lượt thi thứ ${attempts.length + 1}?`))) return

    const { data: attempt, error } = await quizService.startAttempt(quizId)
    if (error) {
      toast.error("Lỗi bắt đầu thi: " + error.message)
      return
    }

    setCurrentAttempt(attempt)
    setAnswers({})
    
    // Áp dụng thuật toán Đảo Đề có Seed từ attempt.id
    let qList = [...(quiz.questions || [])]
    if (quiz.shuffle_questions) {
      qList = seededShuffle(qList, attempt.id)
    }
    if (quiz.shuffle_options) {
      qList = qList.map(q => ({
        ...q,
        options: seededShuffle(q.options || [], attempt.id + q.id)
      }))
    }
    setShuffledQuestions(qList)
    setCurrentQIndex(0)
    
    // Set thời gian đếm ngược
    if (quiz.time_limit_minutes) {
      setTimeLeft(quiz.time_limit_minutes * 60)
    } else {
      setTimeLeft(-1) // Không giới hạn
    }

    setViewState('active')
  }

  const handleOptionSelect = (qId, optionId, qType) => {
    setAnswers(prev => {
      const selected = prev[qId] || []
      
      if (qType === 'multiple') {
        const idx = selected.indexOf(optionId)
        if (idx > -1) {
          return { ...prev, [qId]: selected.filter(id => id !== optionId) }
        } else {
          return { ...prev, [qId]: [...selected, optionId] }
        }
      } else {
        // 'single' hoặc 'true_false'
        return { ...prev, [qId]: [optionId] }
      }
    })
  }

  const prepareAnswersPayload = () => {
    return (quiz.questions || []).map(q => ({
      questionId: q.id,
      selectedOptionIds: answers[q.id] || []
    }))
  }

  const handleAutoSubmit = async () => {
    toast.error("Hết giờ làm bài! Hệ thống đang tự động nộp bài...")
    submitAttemptLogic(true)
  }

  const handleManualSubmit = async () => {
    const unansweredCount = (quiz.questions || []).filter(q => !answers[q.id] || answers[q.id].length === 0).length
    let submitMsg = "Bạn xác nhận nộp bài thi trắc nghiệm này?"
    if (unansweredCount > 0) {
      submitMsg = `Bạn còn ${unansweredCount} câu chưa trả lời. Bạn vẫn muốn nộp bài?`
    }
    
    if (!(await confirm(submitMsg))) return
    submitAttemptLogic(false)
  }

  const submitAttemptLogic = async (isAuto = false) => {
    if (!currentAttempt) return
    setSubmitting(true)

    const payload = prepareAnswersPayload()
    const { data: finalAttempt, error } = await quizService.submitAttempt(currentAttempt.id, payload)

    setSubmitting(false)
    if (error) {
      toast.error("Nộp bài thất bại: " + error.message)
      return
    }

    toast.success("Nộp bài trắc nghiệm thành công!")
    
    if (quiz.show_result_immediately) {
      // Load kết quả chi tiết
      const { data: detailRes } = await quizService.getAttemptResult(currentAttempt.id)
      if (detailRes) setFinishedResult(detailRes)
      setViewState('result')
    } else {
      // Quay về intro
      fetchQuizData()
      setViewState('intro')
    }
  }

  const handleViewAttemptDetail = async (attemptId) => {
    setLoading(true)
    const { data } = await quizService.getAttemptResult(attemptId)
    if (data) {
      setFinishedResult(data)
      setViewState('result')
    }
    setLoading(false)
  }

  const formatCountdown = (seconds) => {
    if (seconds < 0) return 'Vô hạn'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  if (loading) return <div className="p-8 text-left">Đang tải đề thi...</div>
  if (!quiz) return <div className="p-8 text-left">Không tìm thấy thông tin đề thi trắc nghiệm.</div>

  const currentQuestion = shuffledQuestions[currentQIndex]
  const progressPercent = shuffledQuestions.length > 0 ? Math.round(((currentQIndex + 1) / shuffledQuestions.length) * 100) : 0

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8 text-left bg-slate-50 min-h-screen">
      {/* 1. MÀN HÌNH INTRO */}
      {viewState === 'intro' && (
        <div className="space-y-6">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <Link to={`/learning/${courseId}`} className="text-xs font-semibold text-slate-500 hover:underline">&larr; Quay lại khóa học</Link>
            <h1 className="text-2xl font-bold text-slate-900 mt-2">{quiz.title}</h1>
            <p className="text-slate-600 text-sm mt-2 whitespace-pre-wrap">{quiz.description || 'Không có mô tả chi tiết.'}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 border-t pt-6 text-xs text-slate-600">
              <div>
                <span className="font-semibold block text-slate-400">THỜI GIAN LÀM BÀI</span>
                <strong className="text-slate-800 text-sm">{quiz.time_limit_minutes ? `${quiz.time_limit_minutes} phút` : 'Tự do'}</strong>
              </div>
              <div>
                <span className="font-semibold block text-slate-400">ĐIỂM ĐẠT</span>
                <strong className="text-slate-800 text-sm">{quiz.passing_score}%</strong>
              </div>
              <div>
                <span className="font-semibold block text-slate-400">SỐ CÂU HỎI</span>
                <strong className="text-slate-800 text-sm">{quiz.questions?.length || 0} câu</strong>
              </div>
              <div>
                <span className="font-semibold block text-slate-400">LƯỢT THI</span>
                <strong className="text-slate-800 text-sm">{attempts.length} / {quiz.max_attempts}</strong>
              </div>
            </div>

            <div className="mt-8">
              {attempts.length < quiz.max_attempts ? (
                <button
                  onClick={handleStartAttempt}
                  className="rounded-lg bg-accent px-6 py-3 font-bold text-white hover:bg-purple-600 transition shadow-sm w-full md:w-auto"
                >
                  Bắt đầu làm bài thi
                </button>
              ) : (
                <div className="rounded-lg bg-red-50 p-4 border border-red-200 text-red-700 text-sm font-semibold">
                  * Bạn đã sử dụng hết toàn bộ {quiz.max_attempts} lượt thi cho đề này.
                </div>
              )}
            </div>
          </div>

          {/* LỊCH SỬ THI */}
          {attempts.length > 0 && (
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 border-b pb-3 mb-4">Lịch sử làm bài thi</h3>
              <div className="divide-y">
                {attempts.map(att => {
                  const isPassed = att.score >= quiz.passing_score
                  return (
                    <div key={att.id} className="flex justify-between items-center py-3 first:pt-0 last:pb-0">
                      <div>
                        <div className="font-bold text-slate-800 text-sm">Lần làm bài #{att.attempt_number}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Thời gian: {att.time_taken_seconds ? `${Math.floor(att.time_taken_seconds / 60)}p ${att.time_taken_seconds % 60}s` : 'N/A'} | Nộp lúc: {new Date(att.submitted_at).toLocaleDateString()}</div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className="font-black text-slate-900 text-sm">{att.score}%</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {isPassed ? 'Đạt' : 'Chưa Đạt'}
                        </span>
                        {quiz.show_result_immediately && (
                          <button
                            onClick={() => handleViewAttemptDetail(att.id)}
                            className="text-xs text-accent font-semibold hover:underline"
                          >
                            Xem chi tiết
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. MÀN HÌNH LÀM BÀI ACTIVE */}
      {viewState === 'active' && currentQuestion && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header thi */}
          <div className="rounded-xl border bg-white p-4 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-slate-900 text-base truncate max-w-[200px] sm:max-w-[400px]">{quiz.title}</h2>
              <span className="text-xs text-slate-500 font-medium">Câu {currentQIndex + 1} / {shuffledQuestions.length} ({currentQuestion.points} điểm)</span>
            </div>
            {/* Đếm ngược */}
            {timeLeft !== -1 && (
              <div className={`px-4 py-2 rounded-lg font-mono font-bold text-sm ${timeLeft <= 60 ? 'bg-red-50 text-red-600 border border-red-200 animate-pulse' : 'bg-slate-50 text-slate-700 border'}`}>
                ⏱️ {formatCountdown(timeLeft)}
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progressPercent}%` }} />
          </div>

          {/* Câu hỏi */}
          <div className="rounded-xl border bg-white p-6 shadow-sm space-y-6">
            <h3 className="font-extrabold text-slate-900 text-base leading-relaxed whitespace-pre-wrap">
              {currentQuestion.question_text}
            </h3>

            {/* Danh sách đáp án */}
            <div className="space-y-3">
              {currentQuestion.options?.map(opt => {
                const isSelected = (answers[currentQuestion.id] || []).includes(opt.id)
                return (
                  <div
                    key={opt.id}
                    onClick={() => handleOptionSelect(currentQuestion.id, opt.id, currentQuestion.question_type)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition duration-150 flex items-center gap-3 ${
                      isSelected ? 'border-accent bg-purple-50/30' : 'border-slate-100 hover:border-slate-200 bg-white'
                    }`}
                  >
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-accent bg-accent text-white' : 'border-slate-300'
                    }`}>
                      {isSelected && <span className="text-[10px] font-black">✓</span>}
                    </div>
                    <span className="text-slate-800 text-sm font-medium leading-relaxed">{opt.option_text}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Điều khiển chuyển câu */}
          <div className="flex justify-between items-center">
            <button
              onClick={() => setCurrentQIndex(idx => Math.max(0, idx - 1))}
              disabled={currentQIndex === 0}
              className="rounded bg-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-300 disabled:opacity-50 text-xs"
            >
              Quay lại
            </button>

            {currentQIndex < shuffledQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentQIndex(idx => idx + 1)}
                className="rounded bg-accent px-4 py-2 font-bold text-white hover:bg-purple-600 text-xs"
              >
                Tiếp theo
              </button>
            ) : (
              <button
                onClick={handleManualSubmit}
                disabled={submitting}
                className="rounded bg-green-500 px-6 py-2.5 font-bold text-white hover:bg-green-600 disabled:opacity-50 text-sm shadow-sm"
              >
                {submitting ? 'Đang nộp...' : 'Nộp bài thi'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. MÀN HÌNH RESULTS CHI TIẾT */}
      {viewState === 'result' && finishedResult && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header kết quả */}
          <div className="rounded-xl border bg-white p-6 shadow-sm text-center space-y-4">
            <h2 className="font-extrabold text-slate-900 text-xl">Kết quả làm bài</h2>
            
            {/* Vòng tròn điểm số */}
            <div className="relative inline-flex items-center justify-center h-28 w-28 rounded-full border-8 border-slate-100">
              <span className="text-2xl font-black text-slate-900">{finishedResult.attempt.score}%</span>
            </div>

            <div>
              {finishedResult.attempt.score >= quiz.passing_score ? (
                <span className="rounded-full bg-green-100 px-4 py-1 text-sm font-black text-green-800">
                  🎉 CHÚC MỪNG: BẠN ĐÃ ĐẠT
                </span>
              ) : (
                <span className="rounded-full bg-red-100 px-4 py-1 text-sm font-black text-red-800">
                  ⚠️ CẦN CỐ GẮNG: CHƯA ĐẠT
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400">Thời gian làm: {Math.floor(finishedResult.attempt.time_taken_seconds / 60)}p {finishedResult.attempt.time_taken_seconds % 60}s | Điểm chuẩn: {quiz.passing_score}%</p>
            
            <div className="pt-2">
              <button 
                onClick={() => {
                  fetchQuizData()
                  setViewState('intro')
                }}
                className="rounded-lg bg-slate-900 px-6 py-2.5 font-semibold text-white hover:bg-slate-800 transition text-xs"
              >
                Về trang tổng quan
              </button>
            </div>
          </div>

          {/* RÀ SOÁT CÂU SAI / ĐÚNG */}
          <div className="rounded-xl border bg-white p-6 shadow-sm space-y-6">
            <h3 className="font-bold text-slate-900 border-b pb-3 mb-4">Chi tiết bài làm</h3>
            
            <div className="space-y-6 divide-y divide-slate-100">
              {finishedResult.answers?.map((ans, idx) => {
                const q = ans.quiz_questions || {}
                const selectedIds = ans.selected_option_ids || []
                
                return (
                  <div key={ans.id} className="pt-6 first:pt-0">
                    <div className="flex gap-2 items-start justify-between">
                      <h4 className="font-bold text-slate-800 text-sm leading-relaxed">
                        Câu {idx + 1}: {q.question_text}
                      </h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                        ans.is_correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {ans.is_correct ? 'Đúng (+' + ans.points_earned + 'đ)' : 'Sai'}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2">
                      {q.quiz_options?.map(opt => {
                        const isStudentSelected = selectedIds.includes(opt.id)
                        
                        return (
                          <div 
                            key={opt.id}
                            className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                              opt.is_correct ? 'bg-green-50/70 border-green-200 text-green-800 font-medium' :
                              (isStudentSelected && !opt.is_correct) ? 'bg-red-50/70 border-red-200 text-red-800' : 'border-slate-100'
                            }`}
                          >
                            <span>{opt.option_text}</span>
                            <div className="flex items-center gap-1.5 font-bold">
                              {isStudentSelected && <span className="bg-slate-200/80 px-1.5 py-0.5 rounded text-[9px] text-slate-600 uppercase font-bold tracking-wider">Bài làm</span>}
                              {opt.is_correct && <span className="text-green-600">✓ Đáp án đúng</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default QuizPage
