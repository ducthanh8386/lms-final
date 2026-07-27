-- Enrich public course cards (F8-style meta)
DROP VIEW IF EXISTS public.courses_public;

CREATE VIEW public.courses_public AS
SELECT
  c.id,
  c.title,
  c.description,
  c.price,
  c.is_free,
  c.thumbnail,
  c.teacher_id,
  c.category_id,
  c.status,
  c.created_at,
  c.enrollment_mode,
  c.duration_months,
  p.name AS teacher_name,
  cat.name AS category_name,
  (
    SELECT count(*)::int
    FROM public.lessons l
    WHERE l.course_id = c.id
  ) AS lesson_count,
  (
    SELECT count(*)::int
    FROM public.enrollments e
    WHERE e.course_id = c.id
  ) AS student_count,
  (
    SELECT coalesce(round(avg(r.rating)::numeric, 1), 5.0)
    FROM public.reviews r
    WHERE r.course_id = c.id
  ) AS rating_avg,
  (
    SELECT count(*)::int
    FROM public.reviews r
    WHERE r.course_id = c.id
  ) AS rating_count
FROM public.courses c
LEFT JOIN public.profiles_public p ON p.id = c.teacher_id
LEFT JOIN public.categories cat ON cat.id = c.category_id
WHERE c.status = 'approved';

GRANT SELECT ON public.courses_public TO anon, authenticated;
