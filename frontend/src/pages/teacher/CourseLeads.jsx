import { useAuth } from '../../context/AuthContext'
import LeadCrmPanel from '../../components/leads/LeadCrmPanel'

const CourseLeads = () => {
  const { user } = useAuth()
  if (!user) return null
  return <LeadCrmPanel mode="teacher" teacherId={user.id} />
}

export default CourseLeads
