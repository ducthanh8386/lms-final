import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { notificationService } from '../../services/notificationService'

const NotificationBell = () => {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)

  // Fetch initial notifications
  useEffect(() => {
    if (!user) return

    const fetchNotifications = async () => {
      const { data: list } = await notificationService.getNotifications()
      if (list) setNotifications(list)

      const { data: count } = await notificationService.getUnreadCount()
      setUnreadCount(count || 0)
    }

    fetchNotifications()

    // Đăng ký Supabase Realtime
    const channel = supabase
      .channel('notifications_realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev])
        setUnreadCount(prev => prev + 1)
        toast.success(`Thông báo mới: ${payload.new.title}`)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, toast])

  // Đóng dropdown khi bấm ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMarkAsRead = async (item) => {
    if (!item.is_read) {
      await notificationService.markAsRead(item.id)
      setNotifications(prev => 
        prev.map(n => n.id === item.id ? { ...n, is_read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    }

    // Điều hướng dựa trên loại thông báo
    setShowDropdown(false)
    switch (item.type) {
      case 'schedule_reminder':
        navigate('/my-schedule')
        break
      case 'class_invite':
        navigate('/my-classes')
        break
      case 'assignment_due':
      case 'grade_posted':
      case 'quiz_available':
      case 'order_approved':
        navigate('/learning')
        break
      default:
        break
    }
  }

  const handleMarkAllRead = async () => {
    const { error } = await notificationService.markAllAsRead()
    if (error) {
      toast.error("Lỗi cập nhật thông báo: " + error.message)
    } else {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
      toast.success("Đã đánh dấu đọc tất cả thông báo")
    }
    setShowDropdown(false)
  }

  const formatTimeAgo = (isoString) => {
    const diffMs = new Date() - new Date(isoString)
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Vừa xong'
    if (diffMins < 60) return `${diffMins} phút trước`
    if (diffHours < 24) return `${diffHours} giờ trước`
    return `${diffDays} ngày trước`
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'schedule_reminder': return '📅'
      case 'class_invite': return '🏫'
      case 'assignment_due': return '📝'
      case 'grade_posted': return '💯'
      case 'order_approved': return '💳'
      case 'quiz_available': return '💡'
      default: return '🔔'
    }
  }

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Icon chuông và badge số lượng */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative rounded-full p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-accent focus:outline-none transition"
        aria-label="Xem thông báo"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown danh sách thông báo */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 min-w-[320px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 shadow-2xl z-[100] animate-fadeIn text-left">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 px-4 mb-1">
            <span className="font-extrabold text-slate-900 dark:text-white text-sm">Thông báo</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-bold text-accent hover:underline"
              >
                Đọc tất cả
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 scrollbar-thin">
            {notifications.length > 0 ? (
              notifications.slice(0, 10).map(item => (
                <div
                  key={item.id}
                  onClick={() => handleMarkAsRead(item)}
                  className={`flex gap-3 p-3.5 cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/60 ${!item.is_read ? 'bg-slate-50/70 dark:bg-slate-800/40 border-l-2 border-accent' : ''}`}
                >
                  <div className="text-xl self-start">{getTypeIcon(item.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs ${!item.is_read ? 'font-bold text-slate-950 dark:text-white' : 'text-slate-700 dark:text-slate-300'} truncate`}>
                      {item.title}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                      {item.body}
                    </div>
                    <div className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-medium">
                      {formatTimeAgo(item.created_at)}
                    </div>
                  </div>
                  {!item.is_read && (
                    <div className="h-2 w-2 rounded-full bg-accent self-center shrink-0" />
                  )}
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs italic">
                Bạn chưa có thông báo nào.
              </div>
            )}
          </div>
          
          <div className="border-t border-slate-100 dark:border-slate-800 pt-2 text-center">
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              Chỉ hiển thị tối đa 10 thông báo mới nhất
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationBell
