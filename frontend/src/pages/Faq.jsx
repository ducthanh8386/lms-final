import React, { useState } from 'react'
import { Link } from 'react-router-dom'

const FAQ_ITEMS = [
  {
    q: 'Làm sao để mua và học khóa học?',
    a: 'Chọn khóa học → Thêm vào giỏ / Mua ngay → Thanh toán chuyển khoản theo hướng dẫn. Sau khi giảng viên xác nhận, khóa học sẽ xuất hiện trong “Khóa học của tôi”.',
  },
  {
    q: 'Tôi đã chuyển khoản nhưng chưa được mở khóa?',
    a: 'Đơn hàng thường được duyệt trong vòng 24 giờ. Hãy kiểm tra đã nhập đúng nội dung chuyển khoản và (nếu có) đã tải biên lai. Liên hệ giảng viên hoặc hỗ trợ nếu quá thời gian chờ.',
  },
  {
    q: 'Khóa học miễn phí có cần thanh toán không?',
    a: 'Không. Với khóa miễn phí bạn chỉ cần đăng ký / thêm vào giỏ và hoàn tất quy trình đăng ký để bắt đầu học ngay.',
  },
  {
    q: 'Làm sao đổi mật khẩu?',
    a: 'Vào Cài đặt tài khoản → Mật khẩu và bảo mật → nhập mật khẩu hiện tại, rồi đặt mật khẩu mới và xác nhận.',
  },
  {
    q: 'Tôi quên mật khẩu thì phải làm gì?',
    a: 'Nếu vẫn đăng nhập được, hãy đổi mật khẩu trong Cài đặt. Nếu không đăng nhập được, liên hệ hỗ trợ qua email để được hỗ trợ đặt lại.',
  },
  {
    q: 'Lịch học và lớp học dùng như thế nào?',
    a: 'Mục “Lịch học” hiển thị buổi học theo tuần. “Lớp học” là các lớp bạn đã tham gia (qua mã mời). Vào từng buổi để xem chi tiết thời gian và giảng viên.',
  },
  {
    q: 'Làm sao tham gia lớp học của giảng viên?',
    a: 'Nhận mã mời từ giảng viên, vào mục Lớp học hoặc đường dẫn join, nhập mã để tham gia.',
  },
]

const Faq = () => {
  const [openFaq, setOpenFaq] = useState(0)

  return (
    <div className="min-h-[calc(100vh-66px)] bg-[#F5F5F5]">
      <div className="mx-auto max-w-[800px] px-4 py-8 sm:px-6 lg:py-12">
        <header className="mb-8 text-center sm:mb-10">
          <p className="mb-2 text-[13px] font-bold uppercase tracking-wider text-primary">Hỗ trợ</p>
          <h1 className="text-[28px] font-extrabold tracking-tight text-[#242424] sm:text-[34px]">
            Hỏi đáp
          </h1>
          <p className="mx-auto mt-2 max-w-md text-[14px] text-[#666] sm:text-[15px]">
            Các câu hỏi thường gặp khi học và mua khóa trên LMS.
          </p>
        </header>

        <div className="overflow-hidden rounded-2xl border border-[#E8E8E8] bg-white shadow-sm">
          {FAQ_ITEMS.map((item, index) => {
            const open = openFaq === index
            return (
              <div key={item.q} className="border-b border-[#f0f0f0] last:border-b-0">
                <button
                  type="button"
                  onClick={() => setOpenFaq(open ? -1 : index)}
                  className="flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-[#fafafa] sm:px-6 sm:py-5"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[12px] font-bold text-primary">
                    ?
                  </span>
                  <span className="min-w-0 flex-1 text-[15px] font-bold leading-snug text-[#242424] sm:text-[16px]">
                    {item.q}
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    className={`mt-1 h-5 w-5 shrink-0 text-[#999] transition ${open ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
                {open && (
                  <div className="px-5 pb-5 pl-14 text-[14px] leading-relaxed text-[#666] sm:px-6 sm:pl-[52px]">
                    {item.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-8 rounded-2xl border border-[#E8E8E8] bg-white px-5 py-6 text-center shadow-sm sm:px-8">
          <p className="text-[15px] font-bold text-[#242424]">Vẫn còn thắc mắc?</p>
          <p className="mt-1 text-[14px] text-[#666]">
            Liên hệ chúng tôi qua email{' '}
            <a href="mailto:lienhe@lms-demo.vn" className="font-semibold text-primary hover:underline">
              lienhe@lms-demo.vn
            </a>
          </p>
          <Link
            to="/courses"
            className="mt-4 inline-flex rounded-full bg-primary px-5 py-2.5 text-[13px] font-bold text-white hover:bg-brand-orangeHover"
          >
            Xem khóa học
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Faq
