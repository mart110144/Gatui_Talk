// ชั้นติดต่อฐานข้อมูล (Supabase) — ไฟล์อื่นไม่ต้องรู้ว่าใช้ DB อะไร
import { SUPABASE_URL, SUPABASE_ANON_KEY, POST_FETCH_LIMIT } from './config.js';

let client = null;
function db() {
  if (!client) client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}

const POST_COLUMNS = 'id, title, author, category, content, likes, created_at, comments(count)';

// แปลงผลลัพธ์ comments(count) → commentCount
function normalizePost(row) {
  const { comments, ...rest } = row;
  return { ...rest, commentCount: comments?.[0]?.count ?? 0 };
}

export async function fetchPosts() {
  const { data, error } = await db()
    .from('posts')
    .select(POST_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(POST_FETCH_LIMIT);
  if (error) throw error;
  return data.map(normalizePost);
}

export async function fetchPost(id) {
  const { data, error } = await db()
    .from('posts')
    .select(POST_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizePost(data) : null;
}

export async function fetchComments(postId) {
  const { data, error } = await db()
    .from('comments')
    .select('id, author, content, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createPost({ title, category, author, content }) {
  const { data, error } = await db()
    .from('posts')
    .insert({ title, category, author, content })
    .select('id, title, author, category, content, likes, created_at')
    .single();
  if (error) throw error;
  return { ...data, commentCount: 0 };
}

export async function createComment({ postId, author, content }) {
  const { data, error } = await db()
    .from('comments')
    .insert({ post_id: postId, author, content })
    .select('id, author, content, created_at')
    .single();
  if (error) throw error;
  return data;
}

// ไลก์/เลิกไลก์ ผ่านฟังก์ชันใน DB (เพิ่ม-ลดทีละ 1 แบบ atomic) คืนค่าจำนวนไลก์ใหม่
export async function likePost(id) {
  const { data, error } = await db().rpc('like_post', { p_id: id });
  if (error) throw error;
  if (data === null) throw new Error('ไม่พบกระทู้');
  return data;
}

export async function unlikePost(id) {
  const { data, error } = await db().rpc('unlike_post', { p_id: id });
  if (error) throw error;
  if (data === null) throw new Error('ไม่พบกระทู้');
  return data;
}
