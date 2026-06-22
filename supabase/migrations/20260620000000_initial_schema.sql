-- Initial schema for LMS + Marketplace

-- Set up profiles
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text,
  role text check (role in ('admin','teacher','student')) default 'student',
  avatar text,
  status text check (status in ('active','banned')) default 'active',
  created_at timestamp default now()
);

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, role)
  values (new.id, new.raw_user_meta_data->>'name', 'student');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Categories
create table public.categories (
  id bigint generated always as identity primary key,
  name text not null
);

-- Courses
create table public.courses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  price numeric(10,2) default 0,
  is_free boolean default false,
  thumbnail text,
  teacher_id uuid references public.profiles(id) on delete cascade,
  category_id bigint references public.categories(id),
  status text check (status in ('pending','approved','rejected')) default 'pending',
  created_at timestamp default now()
);

-- Lessons
create table public.lessons (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references public.courses(id) on delete cascade,
  title text not null,
  content_type text check (content_type in ('video','text')),
  content text,           -- text content or video link (YouTube)
  order_index int default 0,
  created_at timestamp default now()
);

-- Lesson Progress
create table public.lesson_progress (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete cascade,
  completed_at timestamp default now(),
  unique(user_id, lesson_id)
);

-- Enrollments
create table public.enrollments (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  enrolled_at timestamp default now(),
  unique(user_id, course_id)
);

-- Orders
create table public.orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  total_price numeric(10,2),
  status text check (status in ('pending','paid','failed')) default 'pending',
  created_at timestamp default now()
);

-- Order Items
create table public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid references public.orders(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  price numeric(10,2)
);

-- Assignments
create table public.assignments (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references public.courses(id) on delete cascade,
  title text,
  description text,
  due_date timestamp
);

-- Submissions
create table public.submissions (
  id uuid default gen_random_uuid() primary key,
  assignment_id uuid references public.assignments(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  file_url text,
  grade numeric(5,2),
  feedback text,
  submitted_at timestamp default now()
);

-- Reviews
create table public.reviews (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  rating int check (rating between 1 and 5),
  comment text,
  created_at timestamp default now()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.enrollments enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;
alter table public.reviews enable row level security;

-- PROFILES
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);
create policy "Admin can update any profile" on public.profiles for update using (
  (select role from public.profiles where id = auth.uid()) = 'admin'
);

-- CATEGORIES
create policy "Categories viewable by everyone." on public.categories for select using (true);
-- Only admin can insert/update/delete categories (optional, skipped for brevity, admin can do it if needed via edge func or direct policy)
create policy "Admin full access categories" on public.categories for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- COURSES
create policy "Public can view approved courses" on public.courses for select using (status = 'approved');
create policy "Teacher can view own courses" on public.courses for select using (auth.uid() = teacher_id);
create policy "Teacher can insert own course" on public.courses for insert with check (auth.uid() = teacher_id);
create policy "Teacher can update own course" on public.courses for update using (auth.uid() = teacher_id);
create policy "Admin full access courses" on public.courses for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- LESSONS
create policy "Public can view lessons of approved courses" on public.lessons for select using (
  exists (select 1 from public.courses where id = course_id and status = 'approved')
);
create policy "Teacher can view own lessons" on public.lessons for select using (
  exists (select 1 from public.courses where id = course_id and teacher_id = auth.uid())
);
create policy "Teacher can insert own lessons" on public.lessons for insert with check (
  exists (select 1 from public.courses where id = course_id and teacher_id = auth.uid())
);
create policy "Teacher can update own lessons" on public.lessons for update using (
  exists (select 1 from public.courses where id = course_id and teacher_id = auth.uid())
);
create policy "Teacher can delete own lessons" on public.lessons for delete using (
  exists (select 1 from public.courses where id = course_id and teacher_id = auth.uid())
);
create policy "Admin full access lessons" on public.lessons for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- LESSON PROGRESS
create policy "Users can view own progress" on public.lesson_progress for select using (auth.uid() = user_id);
create policy "Users can insert own progress" on public.lesson_progress for insert with check (auth.uid() = user_id);
-- No update needed, insert is enough.
create policy "Users can delete own progress" on public.lesson_progress for delete using (auth.uid() = user_id);

-- ENROLLMENTS
create policy "Users can view own enrollments" on public.enrollments for select using (auth.uid() = user_id);
create policy "Teachers can view enrollments for their courses" on public.enrollments for select using (
  exists (select 1 from public.courses where id = course_id and teacher_id = auth.uid())
);
-- Client cannot insert directly. Only Edge Function (using service_role) can insert.
-- We do not add insert policy for students.
create policy "Admin full access enrollments" on public.enrollments for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ORDERS & ORDER ITEMS
create policy "Users can view own orders" on public.orders for select using (auth.uid() = user_id);
create policy "Admin full access orders" on public.orders for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Users can view own order items" on public.order_items for select using (
  exists (select 1 from public.orders where id = order_id and user_id = auth.uid())
);
create policy "Admin full access order items" on public.order_items for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ASSIGNMENTS
create policy "Enrolled students can view assignments" on public.assignments for select using (
  exists (select 1 from public.enrollments where course_id = assignments.course_id and user_id = auth.uid())
);
create policy "Teacher can view/manage assignments" on public.assignments for all using (
  exists (select 1 from public.courses where id = course_id and teacher_id = auth.uid())
);

-- SUBMISSIONS
create policy "Students can view own submissions" on public.submissions for select using (student_id = auth.uid());
create policy "Students can insert own submissions" on public.submissions for insert with check (student_id = auth.uid());
create policy "Students can update own submissions (before graded)" on public.submissions for update using (student_id = auth.uid() and grade is null);
create policy "Teachers can view/update submissions for their courses" on public.submissions for select using (
  exists (
    select 1 from public.assignments 
    join public.courses on assignments.course_id = courses.id
    where assignments.id = assignment_id and courses.teacher_id = auth.uid()
  )
);
create policy "Teachers can grade submissions" on public.submissions for update using (
  exists (
    select 1 from public.assignments 
    join public.courses on assignments.course_id = courses.id
    where assignments.id = assignment_id and courses.teacher_id = auth.uid()
  )
);

-- REVIEWS
create policy "Public can view reviews" on public.reviews for select using (true);
create policy "Enrolled students can insert reviews" on public.reviews for insert with check (
  auth.uid() = user_id and 
  exists (select 1 from public.enrollments where user_id = auth.uid() and course_id = reviews.course_id)
);
create policy "Users can update own reviews." on public.reviews for update using (auth.uid() = user_id);
create policy "Users can delete own reviews." on public.reviews for delete using (auth.uid() = user_id);

-- STORAGE BUCKETS
insert into storage.buckets (id, name, public) values ('course-thumbnails', 'course-thumbnails', true) on conflict do nothing;

create policy "Public Access to Thumbnails" on storage.objects for select using ( bucket_id = 'course-thumbnails' );
create policy "Authenticated users can upload thumbnails" on storage.objects for insert with check ( bucket_id = 'course-thumbnails' and auth.role() = 'authenticated' );
create policy "Users can update own thumbnails" on storage.objects for update using ( bucket_id = 'course-thumbnails' and auth.role() = 'authenticated' );
