-- Migration to create Schedules, Participants, and Notifications tables
create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.profiles(id) on delete cascade not null,
  class_id uuid references public.classes(id) on delete set null,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  recurrence_type text default 'none' check (recurrence_type in ('none', 'weekly')),
  recurrence_days int[] default '{}',  -- [0,1,2,3,4,5,6] = CN, T2, T3, T4, T5, T6, T7
  recurrence_end_date date,
  location text,
  meeting_url text,
  color_tag text default 'blue',       -- blue, green, red, purple, orange, etc.
  created_at timestamptz default now(),
  constraint valid_time_range check (end_time > start_time)
);

-- Participants in a schedule
create table public.schedule_participants (
  schedule_id uuid references public.schedules(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  status text default 'pending' check (status in ('pending', 'confirmed', 'declined')),
  primary key (schedule_id, student_id)
);

-- Notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in (
    'schedule_reminder',    -- nhắc nhở lịch học
    'assignment_due',       -- nhắc hạn nộp bài
    'grade_posted',         -- giáo viên chấm điểm
    'class_invite',         -- được mời vào lớp học mới
    'order_approved',       -- đơn hàng đã duyệt
    'quiz_available'        -- quiz trắc nghiệm mới
  )),
  title text not null,
  body text,
  related_id uuid,           -- ID liên kết (schedule_id, assignment_id, order_id, etc.)
  related_type text,         -- 'schedule', 'assignment', 'order', 'quiz', etc.
  is_read boolean default false,
  created_at timestamptz default now()
);

create index on public.schedules(teacher_id);
create index on public.schedules(class_id);
create index on public.schedules(start_time);
create index on public.schedule_participants(student_id);
create index on public.notifications(user_id, is_read, created_at desc);

alter table public.schedules enable row level security;
alter table public.schedule_participants enable row level security;
alter table public.notifications enable row level security;

-- RLS Helper Functions (Security Definer to bypass RLS recursion)
create or replace function public.is_schedule_teacher(schedule_uuid uuid)
returns boolean
security definer
language sql
as $$
  select exists (
    select 1 from public.schedules
    where id = schedule_uuid and teacher_id = auth.uid()
  );
$$;

create or replace function public.is_schedule_participant(schedule_uuid uuid)
returns boolean
security definer
language sql
as $$
  select exists (
    select 1 from public.schedule_participants
    where schedule_id = schedule_uuid and student_id = auth.uid()
  );
$$;

-- RLS Policies

-- Schedules policies
create policy "Teacher manages own schedules" on public.schedules
  for all using (teacher_id = auth.uid());

create policy "Student views own schedules" on public.schedules
  for select using (
    public.is_schedule_participant(id)
    or (class_id is not null and public.is_class_member(class_id))
  );

-- Participants policies
create policy "Teacher manages participants" on public.schedule_participants
  for all using (
    public.is_schedule_teacher(schedule_id)
  );

create policy "Student views own participation" on public.schedule_participants
  for select using (student_id = auth.uid());

-- Notifications policies
create policy "Users can view their own notifications" on public.notifications
  for select using (user_id = auth.uid());

create policy "Users can update their own notifications" on public.notifications
  for update using (user_id = auth.uid());

create policy "Users can delete their own notifications" on public.notifications
  for delete using (user_id = auth.uid());

create policy "Authenticated users can insert notifications" on public.notifications
  for insert with check (auth.role() = 'authenticated');
