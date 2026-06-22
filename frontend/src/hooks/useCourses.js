import { useState, useEffect } from 'react'
import { courseService } from '../services/courseService'

export const useTeacherCourses = (teacherId) => {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!teacherId) {
      setLoading(false)
      return
    }
    const fetchCourses = async () => {
      setLoading(true)
      try {
        const { data, error } = await courseService.getTeacherCourses(teacherId)
        if (error) throw error
        setCourses(data || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchCourses()
  }, [teacherId])

  return { courses, loading, error }
}

export const usePublicCourses = () => {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true)
      try {
        const { data, error } = await courseService.getPublicCourses()
        if (error) throw error
        setCourses(data || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchCourses()
  }, [])

  return { courses, loading, error }
}
