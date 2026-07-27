import { Suspense, useState } from 'react'
import { Outlet } from 'react-router-dom'
import PageFallback from '../ui/PageFallback'
import { TeacherSidebar, TeacherTopbar, TeacherMobileNav } from '../teacher/TeacherNav'

const TeacherLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <div className="hidden w-[260px] shrink-0 lg:block">
          <div className="sticky top-0 h-screen">
            <TeacherSidebar />
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              aria-label="Đóng menu"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] shadow-2xl">
              <TeacherSidebar onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col pb-[calc(56px+env(safe-area-inset-bottom,0px))] lg:pb-0">
          <TeacherTopbar onOpenMenu={() => setMobileOpen(true)} />
          <main className="min-w-0 flex-1">
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
      <TeacherMobileNav />
    </div>
  )
}

export default TeacherLayout
