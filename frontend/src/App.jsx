import React from 'react'
import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Home from './pages/Home'

import CourseList from './pages/student/CourseList'
import CourseDetail from './pages/student/CourseDetail'

import CheckoutDetail from './pages/student/CheckoutDetail'

import CourseManage from './pages/teacher/CourseManage'
import CourseForm from './pages/teacher/CourseForm'
import LessonManage from './pages/teacher/LessonManage'
import OrderManage from './pages/teacher/OrderManage'
import TeacherSettings from './pages/teacher/TeacherSettings'
import Students from './pages/teacher/Students'

import AdminDashboard from './pages/admin/AdminDashboard'
import UserManage from './pages/admin/UserManage'
import CourseApproval from './pages/admin/CourseApproval'

import AssignmentManage from './pages/teacher/AssignmentManage'
import GradingManage from './pages/teacher/GradingManage'

import Cart from './pages/student/Cart'
import MyLearning from './pages/student/MyLearning'
import StudyLesson from './pages/student/StudyLesson'

import MainLayout from './components/layout/MainLayout'

// Teacher pages mới
import ClassManage from './pages/teacher/ClassManage'
import ClassDetail from './pages/teacher/ClassDetail'
import ScheduleManage from './pages/teacher/ScheduleManage'
import QuizManage from './pages/teacher/QuizManage'

// Student pages mới
import MySchedule from './pages/student/MySchedule'
import MyClasses from './pages/student/MyClasses'
import JoinClass from './pages/student/JoinClass'
import QuizPage from './pages/student/QuizPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Routes with Navbar */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        
        {/* Public / Student Routes */}
        <Route path="/courses" element={<CourseList />} />
        <Route path="/courses/:id" element={<CourseDetail />} />
        <Route path="/cart" element={<Cart />} />
        
        <Route element={<ProtectedRoute allowedRoles={['student', 'teacher', 'admin']} />}>
          <Route path="/checkout/detail" element={<CheckoutDetail />} />
          <Route path="/learning" element={<MyLearning />} />
          <Route path="/learning/:id" element={<StudyLesson />} />
          
          {/* Student Routes mới */}
          <Route path="/my-schedule" element={<MySchedule />} />
          <Route path="/my-classes" element={<MyClasses />} />
          <Route path="/join/:inviteCode?" element={<JoinClass />} />
          <Route path="/learning/:courseId/quiz/:quizId" element={<QuizPage />} />
        </Route>

        {/* Teacher Routes */}
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
          
          {/* Teacher Routes mới */}
          <Route path="/teacher/classes" element={<ClassManage />} />
          <Route path="/teacher/classes/:classId" element={<ClassDetail />} />
          <Route path="/teacher/schedule" element={<ScheduleManage />} />
          <Route path="/teacher/courses/:courseId/quizzes" element={<QuizManage />} />
        </Route>

        {/* Admin Routes */}
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
