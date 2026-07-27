import React, { useEffect, useState } from 'react'
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom'
import { courseService } from '../../services/courseService'
import { studentService } from '../../services/studentService'
import { useAuth } from '../../context/AuthContext'
import { useAuthModal } from '../../context/AuthModalContext'
import { paymentService } from '../../services/paymentService'
import { supabase } from '../../lib/supabaseClient'
import { useToast } from '../../context/ToastContext'
import { usePendingPayment } from '../../context/PendingPaymentContext'
import ConsultationCourseLanding from '../../components/course/ConsultationCourseLanding'
import PurchaseCourseLanding from '../../components/course/PurchaseCourseLanding'
import { formatCoursePrice } from '../../components/course/CourseModeBadge'

const CourseDetail = () => {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { openLogin } = useAuthModal()
  const toast = useToast()
  const { hasPendingPayment, pending, setPendingFromSession, refreshPending } = usePendingPayment()
  const [course, setCourse] = useState(null)
  const [lessons, setLessons] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(false)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  useEffect(() => {
    if (authLoading) return

    const fetchCourseData = async () => {
      setLoading(true)
      const { data: cData } = await courseService.getCourseDetail(id)
      if (cData) setCourse(cData)

      if (cData?.enrollment_mode === 'consultation') {
        setLoading(false)
        return
      }

      // Cho xem landing dù chưa đăng nhập (mua mới cần login)
      const { data: lData } = await courseService.getCourseLessons(id)
      if (lData) setLessons(lData)

      const { data: rData } = await courseService.getCourseReviews(id)
      if (rData) setReviews(rData)

      if (user) {
        const { data: enrollData } = await supabase
          .from('enrollments')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_id', id)
          .maybeSingle()
        setIsEnrolled(Boolean(enrollData))
      } else {
        setIsEnrolled(false)
      }

      setLoading(false)
    }
    fetchCourseData()
  }, [id, user, authLoading])

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (!user) return
    setIsSubmittingReview(true)
    const { error } = await studentService.addReview(id, user.id, reviewRating, reviewComment)
    if (error) {
      toast.error('Lỗi đăng đánh giá: ' + error.message)
    } else {
      setReviewComment('')
      const { data: rData } = await courseService.getCourseReviews(id)
      if (rData) setReviews(rData)
      toast.success('Đăng đánh giá thành công!')
    }
    setIsSubmittingReview(false)
  }

  const handleBuy = async () => {
    if (!course || buying) return
    if (isEnrolled) {
      navigate(`/learning/${course.id}`)
      return
    }
    if (!user) {
      openLogin(location.pathname)
      return
    }

    if (!course.is_free && hasPendingPayment) {
      toast.error('Bạn còn đơn chưa thanh toán. Hãy hoàn tất trước khi mua khóa khác.')
      if (pending?.paymentCode) {
        navigate(`/checkout/detail?payment=${encodeURIComponent(pending.paymentCode)}`)
      }
      return
    }

    setBuying(true)
    try {
      if (!course.is_free) {
        const active = (await refreshPending()) || pending
        if (active?.paymentCode) {
          toast.error('Bạn còn đơn chưa thanh toán. Hãy hoàn tất trước khi mua khóa khác.')
          navigate(`/checkout/detail?payment=${encodeURIComponent(active.paymentCode)}`)
          return
        }
      }

      const { data, error: checkoutError } = await studentService.checkout([course], user)
      if (checkoutError) throw new Error(checkoutError.message || 'Không tạo được đơn hàng')

      const paidOrders = (data || []).filter((o) => Number(o.total_price) > 0)
      if (paidOrders.length === 0) {
        toast.success('Đăng ký thành công! Bạn có thể bắt đầu học.')
        navigate(`/learning/${course.id}`)
        return
      }

      const { data: session, error: payErr } = await paymentService.createSession(
        paidOrders.map((o) => o.id)
      )
      if (payErr) throw new Error(payErr.message || 'Không tạo được phiên thanh toán SePay')

      setPendingFromSession(session)
      navigate(`/checkout/detail?payment=${encodeURIComponent(session.paymentCode)}`, {
        state: { payment: session, orders: paidOrders },
      })
    } catch (err) {
      toast.error(err.message || 'Không thể mua khóa học')
    } finally {
      setBuying(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0b0b0f]">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 bg-[#0b0b0f] p-8 text-white/60">
        <p>Không tìm thấy khóa học!</p>
        <Link to="/courses" className="text-sm font-semibold text-primary hover:underline">
          ← Quay lại danh sách
        </Link>
      </div>
    )
  }

  if (course.enrollment_mode === 'consultation') {
    return <ConsultationCourseLanding course={course} />
  }

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '5.0'

  const priceLabel = formatCoursePrice(course)

  const primaryCta = isEnrolled
    ? { label: 'Vào học ngay', action: () => navigate(`/learning/${course.id}`) }
    : hasPendingPayment && !course.is_free
      ? {
          label: 'Tiếp tục thanh toán',
          action: () => {
            if (pending?.paymentCode) {
              navigate(`/checkout/detail?payment=${encodeURIComponent(pending.paymentCode)}`)
            } else if (!user) {
              openLogin(location.pathname)
            }
          },
        }
      : course.is_free
        ? { label: buying ? 'Đang xử lý...' : 'Học miễn phí', action: handleBuy }
        : { label: buying ? 'Đang xử lý...' : 'Mua ngay', action: handleBuy }

  return (
    <PurchaseCourseLanding
      course={course}
      lessons={lessons}
      reviews={reviews}
      avgRating={avgRating}
      isEnrolled={isEnrolled}
      buying={buying}
      primaryCta={primaryCta}
      priceLabel={priceLabel}
      user={user}
      reviewRating={reviewRating}
      setReviewRating={setReviewRating}
      reviewComment={reviewComment}
      setReviewComment={setReviewComment}
      isSubmittingReview={isSubmittingReview}
      onSubmitReview={handleSubmitReview}
    />
  )
}

export default CourseDetail
