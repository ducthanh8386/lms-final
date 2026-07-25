import React, { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import MainLayout from './components/layout/MainLayout'
import PageFallback from './components/ui/PageFallback'

// Eager — trang hay vào / auth (giữ layout ổn định)
import Home from './pages/Home'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'

// Lazy — tách chunk; Suspense nằm trong MainLayout (không che navbar/sidebar)
const CourseList = lazy(() => import('./pages/student/CourseList'))
const CourseDetail = lazy(() => import('./pages/student/CourseDetail'))
const CheckoutDetail = lazy(() => import('./pages/student/CheckoutDetail'))
const Cart = lazy(() => import('./pages/student/Cart'))
const MyLearning = lazy(() => import('./pages/student/MyLearning'))
const StudyLesson = lazy(() => import('./pages/student/StudyLesson'))
const MySchedule = lazy(() => import('./pages/student/MySchedule'))
const MyClasses = lazy(() => import('./pages/student/MyClasses'))
const JoinClass = lazy(() => import('./pages/student/JoinClass'))
const QuizPage = lazy(() => import('./pages/student/QuizPage'))
const AccountSettings = lazy(() => import('./pages/AccountSettings'))
const Faq = lazy(() => import('./pages/Faq'))

const CourseManage = lazy(() => import('./pages/teacher/CourseManage'))
const CourseForm = lazy(() => import('./pages/teacher/CourseForm'))
const LessonManage = lazy(() => import('./pages/teacher/LessonManage'))
const OrderManage = lazy(() => import('./pages/teacher/OrderManage'))
const TeacherSettings = lazy(() => import('./pages/teacher/TeacherSettings'))
const Students = lazy(() => import('./pages/teacher/Students'))
const AssignmentManage = lazy(() => import('./pages/teacher/AssignmentManage'))
const GradingManage = lazy(() => import('./pages/teacher/GradingManage'))
const ClassManage = lazy(() => import('./pages/teacher/ClassManage'))
const ClassDetail = lazy(() => import('./pages/teacher/ClassDetail'))
const ScheduleManage = lazy(() => import('./pages/teacher/ScheduleManage'))
const QuizManage = lazy(() => import('./pages/teacher/QuizManage'))

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const UserManage = lazy(() => import('./pages/admin/UserManage'))
const CourseApproval = lazy(() => import('./pages/admin/CourseApproval'))

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Landing mua khóa — full page, không header/sidebar/footer */}
      <Route
        path="/courses/:id"
        element={
          <Suspense fallback={<PageFallback />}>
            <CourseDetail />
          </Suspense>
        }
      />

      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />

        <Route path="/courses" element={<CourseList />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/faq" element={<Faq />} />

        <Route element={<ProtectedRoute allowedRoles={['student', 'teacher', 'admin']} />}>
          <Route path="/settings" element={<AccountSettings />} />
          <Route path="/checkout/detail" element={<CheckoutDetail />} />
          <Route path="/learning" element={<MyLearning />} />
          <Route path="/learning/:id" element={<StudyLesson />} />
          <Route path="/my-schedule" element={<MySchedule />} />
          <Route path="/my-classes" element={<MyClasses />} />
          <Route path="/join/:inviteCode?" element={<JoinClass />} />
          <Route path="/learning/:courseId/quiz/:quizId" element={<QuizPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['teacher', 'admin']} />}>
          <Route path="/teacher/courses" element={<CourseManage />} />
          <Route path="/teacher/courses/new" element={<CourseForm />} />
          <Route path="/teacher/courses/:id/edit" element={<CourseForm />} />
          <Route path="/teacher/courses/:id/lessons" element={<LessonManage />} />
          <Route path="/teacher/courses/:id/assignments" element={<AssignmentManage />} />
          <Route path="/teacher/assignments/:id/submissions" element={<GradingManage />} />
          <Route path="/teacher/orders" element={<OrderManage />} />
          <Route path="/teacher/students" element={<Students />} />
          <Route path="/teacher/settings" element={<TeacherSettings />} />
          <Route path="/teacher/classes" element={<ClassManage />} />
          <Route path="/teacher/classes/:classId" element={<ClassDetail />} />
          <Route path="/teacher/schedule" element={<ScheduleManage />} />
          <Route path="/teacher/courses/:courseId/quizzes" element={<QuizManage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UserManage />} />
          <Route path="/admin/courses" element={<CourseApproval />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
