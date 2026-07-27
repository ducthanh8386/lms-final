/** First Zod issue message — Zod 4 uses `.issues` (`.errors` removed). */
export function zodFirstMessage(error, fallback = 'Dữ liệu không hợp lệ') {
  const issue = error?.issues?.[0] || error?.errors?.[0]
  if (!issue) return fallback
  const path = Array.isArray(issue.path) && issue.path.length ? `${issue.path.join('.')}: ` : ''
  return `${path}${issue.message || fallback}`
}
