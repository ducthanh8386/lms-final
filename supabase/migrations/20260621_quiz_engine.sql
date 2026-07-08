-- Migration to create Quiz Engine tables (quizzes, questions, options, attempts, answers)
create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade not null,
  lesson_id uuid references public.lessons(id) on delete set null,
  title text not null,
  description text,
  time_limit_minutes int check (time_limit_minutes > 0),
  shuffle_questions boolean default false,
  shuffle_options boolean default false,
  max_attempts int default 1 check (max_attempts >= 1),
  passing_score numeric(5,2) default 0 check (passing_score >= 0 and passing_score <= 100),
  show_result_immediately boolean default true,
  is_published boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Questions
create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references public.quizzes(id) on delete cascade not null,
  question_text text not null,
  question_type text not null check (question_type in ('single', 'multiple', 'true_false')),
  points numeric(5,2) default 1 not null,
  order_index int not null,
  image_url text,
  created_at timestamptz default now()
);

-- Options
create table public.quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references public.quiz_questions(id) on delete cascade not null,
  option_text text not null,
  is_correct boolean default false not null,
  order_index int not null
);

-- Student attempts
create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references public.quizzes(id) on delete cascade not null,
  student_id uuid references public.profiles(id) on delete cascade not null,
  started_at timestamptz default now(),
  submitted_at timestamptz,
  score numeric(5,2),
  time_taken_seconds int,
  attempt_number int not null default 1
);

-- Individual answers in an attempt
create table public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references public.quiz_attempts(id) on delete cascade not null,
  question_id uuid references public.quiz_questions(id) on delete cascade not null,
  selected_option_ids uuid[] default '{}',
  is_correct boolean,
  points_earned numeric(5,2) default 0
);

-- Indexes
create index on public.quizzes(course_id);
create index on public.quiz_questions(quiz_id);
create index on public.quiz_options(question_id);
create index on public.quiz_attempts(quiz_id, student_id);
create index on public.quiz_answers(attempt_id);

-- Enable RLS
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_options enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_answers enable row level security;

-- RLS Policies

-- quizzes
create policy "Teacher manages own quizzes" on public.quizzes
  for all using (
    exists (select 1 from public.courses where id = course_id and teacher_id = auth.uid())
  );

create policy "Student views published quizzes" on public.quizzes
  for select using (
    is_published = true
    and exists (
      select 1 from public.enrollments
      where course_id = quizzes.course_id and user_id = auth.uid()
    )
  );

-- quiz_questions
create policy "Teacher manages quiz questions" on public.quiz_questions
  for all using (
    exists (
      select 1 from public.quizzes q
      join public.courses c on c.id = q.course_id
      where q.id = quiz_id and c.teacher_id = auth.uid()
    )
  );

create policy "Student reads quiz questions" on public.quiz_questions
  for select using (
    exists (
      select 1 from public.quizzes q
      join public.enrollments e on e.course_id = q.course_id
      where q.id = quiz_id and e.user_id = auth.uid() and q.is_published = true
    )
  );

-- quiz_options
create policy "Teacher manages quiz options" on public.quiz_options
  for all using (
    exists (
      select 1 from public.quiz_questions qq
      join public.quizzes q on q.id = qq.quiz_id
      join public.courses c on c.id = q.course_id
      where qq.id = question_id and c.teacher_id = auth.uid()
    )
  );

create policy "Student reads quiz options" on public.quiz_options
  for select using (
    exists (
      select 1 from public.quiz_questions qq
      join public.quizzes q on q.id = qq.quiz_id
      join public.enrollments e on e.course_id = q.course_id
      where qq.id = question_id and e.user_id = auth.uid() and q.is_published = true
    )
  );

-- quiz_attempts
create policy "Student manages own attempts" on public.quiz_attempts
  for all using (student_id = auth.uid());

create policy "Teacher views course attempts" on public.quiz_attempts
  for select using (
    exists (
      select 1 from public.quizzes q
      join public.courses c on c.id = q.course_id
      where q.id = quiz_id and c.teacher_id = auth.uid()
    )
  );

-- quiz_answers
create policy "Student manages own answers" on public.quiz_answers
  for all using (
    exists (
      select 1 from public.quiz_attempts qa
      where qa.id = attempt_id and qa.student_id = auth.uid()
    )
  );
