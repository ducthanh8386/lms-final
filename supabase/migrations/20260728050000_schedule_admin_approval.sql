-- Buổi học Zoom: GV tạo → chờ Admin duyệt → mới hiện cho HV

-- Existing rows get approved; new inserts default to pending
alter table public.schedules
  add column if not exists approval_status text not null default 'approved',
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references public.profiles(id),
  add column if not exists rejection_reason text;

alter table public.schedules
  alter column approval_status set default 'pending';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'schedules_approval_status_check'
  ) then
    alter table public.schedules
      add constraint schedules_approval_status_check
      check (approval_status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

update public.schedules
set approved_at = coalesce(approved_at, created_at)
where approval_status = 'approved' and approved_at is null;

create index if not exists idx_schedules_approval_status
  on public.schedules(approval_status, start_time);

-- HV chỉ xem buổi đã duyệt
drop policy if exists "Student views own schedules" on public.schedules;
create policy "Student views own schedules" on public.schedules
  for select using (
    approval_status = 'approved'
    and (
      public.is_schedule_participant(id)
      or (class_id is not null and public.is_class_member(class_id))
    )
  );

-- Admin xem / duyệt mọi lịch
drop policy if exists "Admin manages all schedules" on public.schedules;
create policy "Admin manages all schedules" on public.schedules
  for all using ((auth.jwt() -> 'app_metadata' ->> 'userrole') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'userrole') = 'admin');

-- RPC duyệt / từ chối
create or replace function public.review_schedule(
  p_schedule_id uuid,
  p_decision text,
  p_reason text default null
)
returns public.schedules
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.schedules;
  v_role text := auth.jwt() -> 'app_metadata' ->> 'userrole';
begin
  if v_role is distinct from 'admin' then
    raise exception 'Chỉ admin mới được duyệt lịch học';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'Quyết định không hợp lệ';
  end if;

  update public.schedules
  set
    approval_status = p_decision,
    approved_at = case when p_decision = 'approved' then now() else approved_at end,
    approved_by = auth.uid(),
    rejection_reason = case when p_decision = 'rejected' then nullif(trim(p_reason), '') else null end
  where id = p_schedule_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Không tìm thấy buổi học';
  end if;

  return v_row;
end;
$$;

grant execute on function public.review_schedule(uuid, text, text) to authenticated;

-- GV không tự đổi trạng thái duyệt
create or replace function public.protect_schedule_approval()
returns trigger
language plpgsql
as $$
begin
  if (auth.jwt() -> 'app_metadata' ->> 'userrole') is distinct from 'admin' then
    if new.approval_status is distinct from old.approval_status
       or new.approved_at is distinct from old.approved_at
       or new.approved_by is distinct from old.approved_by
       or new.rejection_reason is distinct from old.rejection_reason then
      raise exception 'Chỉ admin được thay đổi trạng thái duyệt lịch học';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_schedule_approval on public.schedules;
create trigger trg_protect_schedule_approval
  before update on public.schedules
  for each row
  execute function public.protect_schedule_approval();
