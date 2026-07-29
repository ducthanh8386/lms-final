import React, { lazy, Suspense } from 'react'
import { Navigate, Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import MainLayout from './components/layout/MainLayout'
import TeacherLayout from './components/layout/TeacherLayout'
import AdminLayout from './components/layout/AdminLayout'
import PageFallback from './components/ui/PageFallback'

import Home from './pages/Home'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'

const CourseList = lazy(() => import('./pages/student/CourseList'))
const CourseDetail = lazy(() => import('./pages/student/CourseDetail'))
const CheckoutDetail = lazy(() => import('./pages/student/CheckoutDetail'))
const MyLearning = lazy(() => import('./pages/student/MyLearning'))
const StudyLesson = lazy(() => import('./pages/student/StudyLesson'))
const MySchedule = lazy(() => import('./pages/student/MySchedule'))
const MyClasses = lazy(() => import('./pages/student/MyClasses'))
const JoinClass = lazy(() => import('./pages/student/JoinClass'))
const QuizPage = lazy(() => import('./pages/student/QuizPage'))
const AccountSettings = lazy(() => import('./pages/AccountSettings'))
const Profile = lazy(() => import('./pages/student/Profile'))
const Faq = lazy(() => import('./pages/Faq'))

const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'))
const CourseManage = lazy(() => import('./pages/teacher/CourseManage'))
const CourseForm = lazy(() => import('./pages/teacher/CourseForm'))
const LessonManage = lazy(() => import('./pages/teacher/LessonManage'))
const TeacherCourseQA = lazy(() => import('./pages/teacher/TeacherCourseQA'))
const CourseLeads = lazy(() => import('./pages/teacher/CourseLeads'))
const TeacherSettings = lazy(() => import('./pages/teacher/TeacherSettings'))
const Students = lazy(() => import('./pages/teacher/Students'))
const TeacherLearningProgress = lazy(() => import('./pages/teacher/TeacherLearningProgress'))
const TeacherReviews = lazy(() => import('./pages/teacher/TeacherReviews'))
const AssignmentManage = lazy(() => import('./pages/teacher/AssignmentManage'))
const GradingManage = lazy(() => import('./pages/teacher/GradingManage'))
const ClassManage = lazy(() => import('./pages/teacher/ClassManage'))
const ClassDetail = lazy(() => import('./pages/teacher/ClassDetail'))
const ScheduleManage = lazy(() => import('./pages/teacher/ScheduleManage'))
const QuizManage = lazy(() => import('./pages/teacher/QuizManage'))

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const UserManage = lazy(() => import('./pages/admin/UserManage'))
const CourseApproval = lazy(() => import('./pages/admin/CourseApproval'))
const AdminCourses = lazy(() => import('./pages/admin/AdminCourses'))
const AdminPayments = lazy(() => import('./pages/admin/AdminPayments'))
const AdminLeads = lazy(() => import('./pages/admin/AdminLeads'))
const AdminClasses = lazy(() => import('./pages/admin/AdminClasses'))
const AdminScheduleApproval = lazy(() => import('./pages/admin/AdminScheduleApproval'))
const AdminUserList = lazy(() => import('./pages/admin/AdminUserList'))

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/courses/:id"
        element={
          <Suspense fallback={<PageFallback />}>
            <CourseDetail />
          </Suspense>
        }
      />

      <Route element={<ProtectedRoute allowedRoles={['teacher', 'admin']} />}>
        <Route element={<TeacherLayout />}>
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/teacher/courses" element={<CourseManage />} />
          <Route path="/teacher/courses/new" element={<Navigate to="/teacher/courses" replace />} />
          <Route path="/teacher/courses/:id/edit" element={<Navigate to="/teacher/courses" replace />} />
          <Route path="/teacher/courses/:id/lessons" element={<LessonManage />} />
          <Route path="/teacher/courses/:id/qa" element={<TeacherCourseQA />} />
          <Route path="/teacher/courses/:id/assignments" element={<AssignmentManage />} />
          <Route path="/teacher/assignments/:id/submissions" element={<GradingManage />} />
          <Route path="/teacher/orders" element={<Navigate to="/teacher" replace />} />
          <Route path="/teacher/leads" element={<CourseLeads />} />
          <Route path="/teacher/students" element={<Students />} />
          <Route path="/teacher/progress" element={<TeacherLearningProgress />} />
          <Route path="/teacher/reviews" element={<TeacherReviews />} />
          <Route path="/teacher/settings" element={<TeacherSettings />} />
          <Route path="/teacher/classes" element={<ClassManage />} />
          <Route path="/teacher/classes/:classId" element={<ClassDetail />} />
          <Route path="/teacher/schedule" element={<ScheduleManage />} />
          <Route path="/teacher/courses/:courseId/quizzes" element={<QuizManage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/courses" element={<AdminCourses />} />
          <Route path="/admin/courses/new" element={<CourseForm />} />
          <Route path="/admin/courses/:id/edit" element={<CourseForm />} />
          <Route path="/admin/courses/approval" element={<CourseApproval />} />
          <Route path="/admin/payments" element={<AdminPayments />} />
          <Route path="/admin/teachers" element={<AdminUserList role="teacher" />} />
          <Route path="/admin/students" element={<AdminUserList role="student" />} />
          <Route path="/admin/users" element={<UserManage />} />
          <Route path="/admin/leads" element={<AdminLeads />} />
          <Route path="/admin/classes" element={<AdminClasses />} />
          <Route path="/admin/schedules" element={<AdminScheduleApproval />} />
        </Route>
      </Route>

      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/courses" element={<CourseList />} />
        <Route path="/cart" element={<Navigate to="/courses" replace />} />
        <Route path="/faq" element={<Faq />} />

        <Route element={<ProtectedRoute allowedRoles={['student', 'teacher', 'admin']} />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<AccountSettings />} />
          <Route path="/checkout/detail" element={<CheckoutDetail />} />
          <Route path="/learning" element={<MyLearning />} />
          <Route path="/learning/:id" element={<StudyLesson />} />
          <Route path="/my-schedule" element={<MySchedule />} />
          <Route path="/my-classes" element={<MyClasses />} />
          <Route path="/join/:inviteCode?" element={<JoinClass />} />
          <Route path="/learning/:courseId/quiz/:quizId" element={<QuizPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
