-- ============================================================
--  Webboard schema (Supabase / PostgreSQL)
--  วิธีใช้: Supabase Dashboard → SQL Editor → วางทั้งไฟล์ → Run
--  รันซ้ำได้ (ใช้ if not exists / or replace / drop policy if exists)
-- ============================================================

-- ---------- ตาราง ----------

create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(btrim(title))   between 1 and 150),
  category    text not null check (category in ('พูดคุยทั่วไป', 'ถาม-ตอบ', 'แชร์ความรู้', 'สัพเพเหระ')),
  author      text not null default 'สมาชิกนิรนาม' check (char_length(btrim(author)) between 1 and 40),
  content     text not null check (char_length(btrim(content)) between 1 and 5000),
  likes       integer not null default 0 check (likes >= 0),
  created_at  timestamptz not null default now()
);

create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  author      text not null default 'ผู้ใช้นิรนาม' check (char_length(btrim(author)) between 1 and 40),
  content     text not null check (char_length(btrim(content)) between 1 and 1000),
  created_at  timestamptz not null default now()
);

create index if not exists posts_created_at_idx    on public.posts (created_at desc);
create index if not exists comments_post_id_idx    on public.comments (post_id, created_at);

-- ---------- Row Level Security ----------
-- เปิด RLS: ถ้าไม่มี policy อนุญาต = ทำไม่ได้
-- ผลคือ ทุกคน (anon) "อ่าน" และ "เพิ่ม" ได้ แต่ "แก้ไข/ลบ" ไม่ได้
-- (ลบ/แก้ ทำผ่าน Dashboard ซึ่งใช้สิทธิ์เจ้าของโปรเจกต์)

alter table public.posts    enable row level security;
alter table public.comments enable row level security;

drop policy if exists "posts_select_all"    on public.posts;
drop policy if exists "posts_insert_all"    on public.posts;
drop policy if exists "comments_select_all" on public.comments;
drop policy if exists "comments_insert_all" on public.comments;

create policy "posts_select_all"
  on public.posts for select to anon, authenticated
  using (true);

create policy "posts_insert_all"
  on public.posts for insert to anon, authenticated
  with check (likes = 0);

create policy "comments_select_all"
  on public.comments for select to anon, authenticated
  using (true);

create policy "comments_insert_all"
  on public.comments for insert to anon, authenticated
  with check (true);

-- ---------- สิทธิ์ระดับคอลัมน์ ----------
-- ให้ผู้ใช้ทั่วไป insert ได้เฉพาะคอลัมน์ที่จำเป็น
-- (กันการส่ง created_at / likes / id ปลอมมาเอง เช่นตั้งเวลาล่วงหน้าให้กระทู้ติดบนสุด)

revoke insert, update, delete on public.posts    from anon, authenticated;
revoke insert, update, delete on public.comments from anon, authenticated;

grant insert (title, category, author, content) on public.posts    to anon, authenticated;
grant insert (post_id, author, content)         on public.comments to anon, authenticated;

-- ---------- ฟังก์ชันไลก์ ----------
-- แก้ตัวเลข likes ตรงๆ ไม่ได้ (ไม่มีสิทธิ์ update) จึงต้องผ่านฟังก์ชันที่เพิ่ม/ลดทีละ 1
-- security definer = ทำงานด้วยสิทธิ์เจ้าของฟังก์ชัน

create or replace function public.like_post(p_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.posts set likes = likes + 1 where id = p_id returning likes;
$$;

create or replace function public.unlike_post(p_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.posts set likes = greatest(likes - 1, 0) where id = p_id returning likes;
$$;

revoke all on function public.like_post(uuid)   from public;
revoke all on function public.unlike_post(uuid) from public;
grant execute on function public.like_post(uuid)   to anon, authenticated;
grant execute on function public.unlike_post(uuid) to anon, authenticated;
