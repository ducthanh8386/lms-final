import React, { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import MobileBottomNav from './MobileBottomNav'
import SiteFooter from './SiteFooter'
import PageFallback from '../ui/PageFallback'

const MainLayout = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="pt-[66px] pb-[calc(56px+env(safe-area-inset-bottom,0px))] md:pb-0">
        <div className="flex">
          <Sidebar />
          <main className="min-w-0 flex-1 bg-white">
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>

      <div className="pb-[calc(56px+env(safe-area-inset-bottom,0px))] md:pb-0">
        <SiteFooter />
      </div>

      <MobileBottomNav />
    </div>
  )
}

export default MainLayout
