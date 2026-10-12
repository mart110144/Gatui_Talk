// ============================================================
//  ตั้งค่าเว็บบอร์ด — แก้ไฟล์นี้ไฟล์เดียวเพื่อเชื่อมฐานข้อมูล
// ============================================================

// ได้จาก Supabase → Project Settings → API
// (ค่าสองตัวนี้ "เปิดเผยได้" เพราะความปลอดภัยคุมด้วย RLS ใน database/schema.sql
//  แต่ห้ามเอา service_role key มาใส่ที่นี่เด็ดขาด)
export const SUPABASE_URL = 'https://ejasgqhgdtfknyjbuxoa.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_2-FfhDAmvOq_nMnNPIN4yA_-JoN3k7M';

export const isConfigured =
  !SUPABASE_URL.includes('YOUR-PROJECT-ID') &&
  !SUPABASE_ANON_KEY.startsWith('YOUR-');

// หมวดหมู่ — ถ้าแก้ตรงนี้ ต้องแก้ check constraint ใน database/schema.sql ให้ตรงกันด้วย
export const CATEGORIES = [
  { value: 'พูดคุยทั่วไป', label: '💬 พูดคุยทั่วไป' },
  { value: 'ถาม-ตอบ',      label: '❓ ถาม-ตอบ' },
  { value: 'แชร์ความรู้',   label: '💡 แชร์ความรู้' },
  { value: 'สัพเพเหระ',    label: '☕ สัพเพเหระ' },
];

// ความยาวสูงสุด (ต้องตรงกับ check constraint ใน schema.sql)
export const LIMITS = {
  title: 150,
  content: 5000,
  author: 40,
  comment: 1000,
};

export const DEFAULT_POST_AUTHOR = 'สมาชิกนิรนาม';
export const DEFAULT_COMMENT_AUTHOR = 'ผู้ใช้นิรนาม';

// โหลดกระทู้ล่าสุดกี่รายการต่อครั้ง (ค้นหา/เรียงลำดับทำฝั่งเบราว์เซอร์จากชุดนี้)
export const POST_FETCH_LIMIT = 200;

// เวลารอระหว่างการโพสต์แต่ละครั้ง (มิลลิวินาที) กันกดรัว
export const COOLDOWN_MS = 15000;

// คีย์ใน localStorage (เก็บเฉพาะความสะดวกของผู้ใช้ ไม่ใช่ข้อมูลกระทู้)
export const STORAGE_KEYS = {
  nickname: 'webboard_nickname',
  liked: 'webboard_liked_posts',
  lastPostAt: 'webboard_last_post_at',
  lastCommentAt: 'webboard_last_comment_at',
};
