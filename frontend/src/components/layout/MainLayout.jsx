import React, { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import SiteFooter from './SiteFooter'
import PageFallback from '../ui/PageFallback'

const MainLayout = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="pt-[66px]">
        <div className="flex">
          <Sidebar />
          <main className="min-w-0 flex-1 bg-white">
            {/* Chỉ vùng nội dung mới Suspense — navbar/sidebar/footer luôn giữ */}
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>

      <SiteFooter />
    </div>
  )
}

export default MainLayout
