import React from 'react'
import { Link } from 'react-router-dom'

const linkClass =
  'block text-[14px] leading-7 text-[#a9b3bb] transition-colors hover:text-white'

const headingClass =
  'mb-4 min-h-9 text-[14px] font-bold uppercase leading-9 tracking-wide text-white'

const SiteFooter = () => {
  return (
    <footer className="w-full bg-[#181821]">
      {/* F8: padding ~68px 40–100px; 5 cột */}
      <div className="w-full px-5 pt-12 pb-10 sm:px-10 lg:px-[60px] lg:pt-[68px] xl:px-[100px]">
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* 1 — Brand + liên hệ */}
          <div className="min-w-0">
            <div className="mb-4 flex min-h-9 items-center gap-2.5">
              <Link to="/" className="inline-flex items-center gap-2.5">
                <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg bg-primary text-[12px] font-extrabold text-white">
                  LMS
                </span>
                <span className="text-[14px] font-bold leading-snug text-white" style={{ fontFamily: '"Be Vietnam Pro", system-ui, sans-serif' }}>HỌC LẬP TRÌNH<br className="hidden xl:block" />{` \u0110\u1EC4 ĐI LÀM`}</span>
              </Link>
            </div>
            <ul className="space-y-1 text-[14px] leading-7 text-[#a9b3bb]">
              <li>
                Điện thoại:{' '}
                <a href="tel:02412345678" className="hover:text-white">
                  024 1234 5678
                </a>
              </li>
              <li>
                Email:{' '}
                <a href="mailto:lienhe@lms-demo.vn" className="hover:text-white">
                  lienhe@lms-demo.vn
                </a>
              </li>
              <li>Địa chỉ liên hệ: Số 18, ngõ 72 Tây Sơn, Đống Đa, Hà Nội</li>
            </ul>
          </div>

          {/* 2 — Về LMS */}
          <div className="min-w-0">
            <h4 className={headingClass}>Về LMS</h4>
            <ul className="space-y-1">
              <li><Link to="/" className={linkClass}>Giới thiệu</Link></li>
              <li><Link to="/" className={linkClass}>Liên hệ</Link></li>
              <li><span className={linkClass}>Điều khoản &amp; Quy định</span></li>
              <li><span className={linkClass}>Chính sách bảo mật</span></li>
            </ul>
          </div>

          {/* 3 — Hỗ trợ */}
          <div className="min-w-0">
            <h4 className={headingClass}>Hỗ trợ</h4>
            <ul className="space-y-1">
              <li><Link to="/faq" className={linkClass}>Hỏi đáp</Link></li>
              <li><span className={linkClass}>Chính sách thanh toán</span></li>
              <li><span className={linkClass}>Chính sách vận chuyển</span></li>
              <li><span className={linkClass}>Chính sách kiểm hàng</span></li>
              <li><span className={linkClass}>Quy định về giá</span></li>
            </ul>
          </div>

          {/* 4 — Công cụ / sản phẩm */}
          <div className="min-w-0">
            <h4 className={headingClass}>Sản phẩm</h4>
            <ul className="space-y-1">
              <li><Link to="/courses" className={linkClass}>Khóa học</Link></li>
              <li><Link to="/learning" className={linkClass}>Khóa học của tôi</Link></li>
              <li><Link to="/my-classes" className={linkClass}>Lớp học</Link></li>
              <li><Link to="/my-schedule" className={linkClass}>Lịch học</Link></li>
              <li><Link to="/register" className={linkClass}>Đăng ký giảng viên</Link></li>
            </ul>
          </div>

          {/* 5 — Công ty */}
          <div className="min-w-0">
            <h4 className={headingClass}>
              Công ty TNHH Giáo dục LMS Demo
            </h4>
            <p className="text-[14px] leading-7 text-[#a9b3bb]">
              Địa chỉ: Tầng 3, Tòa nhà Sao Việt, số 72 Trần Duy Hưng, Cầu Giấy, Hà Nội
            </p>
            <p className="mt-2 text-[14px] leading-7 text-[#a9b3bb]">
              Mã số doanh nghiệp: 0101234567 — dữ liệu mô phỏng phục vụ đồ án
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col-reverse items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-center text-[13px] text-[#a9b3bb]/80 sm:text-left">
            © 2024 - {new Date().getFullYear()} LMS. Nền tảng học lập trình hàng ĐỄu Việt Nam.
          </p>
          <div className="flex items-center gap-2">
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noreferrer"
              aria-label="YouTube"
              className="flex h-9 w-9 items-center justify-center rounded bg-white/10 text-[#eb2c3b] transition hover:bg-white/15"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.8 15.5v-7l6.3 3.5-6.3 3.5z" />
              </svg>
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
              className="flex h-9 w-9 items-center justify-center rounded bg-white/10 text-[#4867aa] transition hover:bg-white/15"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                <path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H7v3h3v7h3v-7h3l1-3h-4v-2c0-.6.4-1 1-1z" />
              </svg>
            </a>
            <a
              href="https://tiktok.com"
              target="_blank"
              rel="noreferrer"
              aria-label="TikTok"
              className="flex h-9 w-9 items-center justify-center rounded bg-white/10 text-white transition hover:bg-white/15"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                <path d="M19.6 7.2a5.4 5.4 0 0 1-3.2-1V15a5.4 5.4 0 1 1-5.4-5.4v2.2a3.2 3.2 0 1 0 3.2 3.2V2.5h2.2a5.4 5.4 0 0 0 3.2 4.7v0z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default SiteFooter
