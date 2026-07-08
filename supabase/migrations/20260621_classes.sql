-- Migration to create Classes and Class Members tables
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.profiles(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete set null,
  name text not null,
  description text,
  invite_code text unique not null default upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  max_students int default 50,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table public.class_members (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes(id) on delete cascade not null,
  student_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamptz default now(),
  status text default 'active' check (status in ('active', 'removed')),
  unique(class_id, student_id)
);

create index on public.classes(teacher_id);
create index on public.class_members(class_id);
create index on public.class_members(student_id);

alter table public.classes enable row level security;
alter table public.class_members enable row level security;

-- RLS Helper Functions (Security Definer to bypass RLS recursion)
create or replace function public.is_class_teacher(class_uuid uuid)
returns boolean
security definer
language sql
as $$
  select exists (
    select 1 from public.classes
    where id = class_uuid and teacher_id = auth.uid()
  );
$$;

create or replace function public.is_class_member(class_uuid uuid)
returns boolean
security definer
language sql
as $$
  select exists (
    select 1 from public.class_members
    where class_id = class_uuid and student_id = auth.uid() and status = 'active'
  );
$$;

-- RLS Policies

-- Teacher has full access to their own classes
create policy "Teacher manages own classes" on public.classes
  for all using (teacher_id = auth.uid());

-- Students can view classes they are actively enrolled in
create policy "Student views enrolled classes" on public.classes
  for select using (
    public.is_class_member(id)
  );

-- Anyone can view active classes (needed for querying by invite code before joining)
create policy "Anyone can view active classes" on public.classes
  for select using (
    is_active = true
  );

-- Teacher can manage the members of their classes
create policy "Teacher manages class members" on public.class_members
  for all using (
    public.is_class_teacher(class_id)
  );

-- Students can view their own membership status
create policy "Student views own membership" on public.class_members
  for select using (student_id = auth.uid());

-- Students can join class by creating a membership record for themselves
create policy "Student joins class" on public.class_members
  for insert with check (student_id = auth.uid());
