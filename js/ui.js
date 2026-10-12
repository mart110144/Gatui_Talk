// ส่วนแสดงผลทั้งหมด (สร้าง HTML / สลับหน้า) — ไม่ยุ่งกับฐานข้อมูล
import { CATEGORIES } from './config.js';
import { $, escapeHtml, formatTimeThai } from './utils.js';

const APP_TITLE = 'กระทู้คุยกัน - เว็บบอร์ดคอมมูนิตี้เรียบง่าย';

/* ---------- หมวดหมู่ / แท็บ ---------- */

const PILL_BASE = 'whitespace-nowrap text-xs md:text-sm font-medium px-3.5 py-1.5 rounded-xl transition-all';
const PILL_ON = 'bg-blue-600 text-white shadow-sm';
const PILL_OFF = 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100';

export function renderCategoryPills(current) {
  const items = [{ value: 'all', label: 'ทั้งหมด' }, ...CATEGORIES];
  $('categoryPills').innerHTML = items
    .map(
      (c) => `
      <button type="button" data-action="category" data-category="${escapeHtml(c.value)}"
        class="${PILL_BASE} ${c.value === current ? PILL_ON : PILL_OFF}">
        ${escapeHtml(c.label)}
      </button>`
    )
    .join('');
}

export function renderCategoryOptions() {
  $('postCategoryInput').innerHTML = CATEGORIES.map(
    (c) => `<option value="${escapeHtml(c.value)}">${escapeHtml(c.label)}</option>`
  ).join('');
}

export function renderSortTabs(mode) {
  $('tabTrending').className = 'sort-tab' + (mode === 'trending' ? ' active-trending' : '');
  $('tabLatest').className = 'sort-tab' + (mode === 'latest' ? ' active-latest' : '');
}

export function setClearSearchVisible(visible) {
  $('clearSearchBtn').classList.toggle('hidden', !visible);
}

/* ---------- สลับหน้า ---------- */

export function showView(name) {
  $('homeView').classList.toggle('hidden', name !== 'home');
  $('detailView').classList.toggle('hidden', name !== 'detail');
  if (name === 'home') document.title = APP_TITLE;
}

export function setConfigNoticeVisible(visible) {
  $('configNotice').classList.toggle('hidden', !visible);
}

/* ---------- หน้ารวมกระทู้ ---------- */

const SKELETON = Array.from({ length: 3 })
  .map(
    () => `
    <div class="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse space-y-3">
      <div class="h-3 w-1/3 bg-slate-200 rounded"></div>
      <div class="h-5 w-3/4 bg-slate-200 rounded"></div>
      <div class="h-3 w-full bg-slate-100 rounded"></div>
    </div>`
  )
  .join('');

function postCard(post, index, sort) {
  const isHot = post.commentCount >= 3;
  const isTop = sort === 'trending' && index === 0 && post.commentCount > 0;

  return `
    <article data-action="open-post" data-id="${escapeHtml(post.id)}" tabindex="0" role="link"
      class="group bg-white rounded-2xl border border-slate-200/90 hover:border-blue-300 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden">
      ${
        isTop
          ? `<div class="absolute top-0 right-0 bg-gradient-to-l from-orange-500 to-amber-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-bl-xl shadow-sm flex items-center gap-1">
               <i class="fa-solid fa-crown text-[9px]"></i> ยอดนิยมอันดับ 1
             </div>`
          : ''
      }
      <div class="flex items-start justify-between gap-3">
        <div class="space-y-1.5 flex-1 min-w-0 pr-2">
          <div class="flex items-center gap-2 flex-wrap text-xs">
            <span class="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">${escapeHtml(post.category)}</span>
            <span class="text-slate-400">•</span>
            <span class="text-slate-500 font-medium">${escapeHtml(post.author)}</span>
            <span class="text-slate-400">•</span>
            <span class="text-slate-400">${formatTimeThai(post.created_at)}</span>
          </div>
          <h3 class="text-base sm:text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors leading-snug break-words">${escapeHtml(post.title)}</h3>
          <p class="text-slate-500 text-xs sm:text-sm line-clamp-2 leading-relaxed break-words">${escapeHtml(post.content)}</p>
        </div>

        <div class="flex-shrink-0 self-center">
          <div class="flex flex-col items-center justify-center px-3 py-2 rounded-xl border ${isHot ? 'bg-orange-50/70 border-orange-200 text-orange-600' : 'bg-slate-50 border-slate-200 text-slate-600'} group-hover:scale-105 transition-transform">
            <span class="flex items-center gap-1 text-sm sm:text-base font-bold">
              ${isHot ? '<i class="fa-solid fa-fire text-orange-500 text-xs"></i>' : '<i class="fa-regular fa-comment text-slate-400 text-xs"></i>'}
              <span>${post.commentCount}</span>
            </span>
            <span class="text-[10px] font-medium text-slate-400">ตอบกลับ</span>
          </div>
        </div>
      </div>

      <div class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
        <span class="flex items-center gap-1"><i class="fa-regular fa-heart"></i> ${post.likes} ไลก์</span>
        <span class="text-blue-600 font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
          อ่านต่อ <i class="fa-solid fa-angle-right text-[10px]"></i>
        </span>
      </div>
    </article>`;
}

// status: 'loading' | 'error' | 'ready'
export function renderFeed({ posts, sort, status, hasAnyPosts }) {
  const container = $('postsContainer');
  const empty = $('emptyState');
  const badge = $('postCountBadge');

  if (status === 'loading') {
    container.innerHTML = SKELETON;
    empty.classList.add('hidden');
    badge.textContent = '';
    return;
  }

  if (status === 'error') {
    container.innerHTML = `
      <div class="text-center py-12 bg-white rounded-2xl border border-red-100">
        <p class="text-sm font-semibold text-red-600">โหลดกระทู้ไม่สำเร็จ</p>
        <p class="text-xs text-slate-400 mt-1">ตรวจสอบอินเทอร์เน็ต หรือการตั้งค่า Supabase แล้วลองใหม่</p>
        <button data-action="retry" class="mt-3 text-xs font-medium bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700">ลองอีกครั้ง</button>
      </div>`;
    empty.classList.add('hidden');
    badge.textContent = '';
    return;
  }

  badge.textContent = `พบ ${posts.length} กระทู้`;

  if (posts.length === 0) {
    container.innerHTML = '';
    $('emptyTitle').textContent = hasAnyPosts ? 'ไม่พบกระทู้ที่ตรงกับการค้นหา' : 'ยังไม่มีกระทู้';
    $('emptyHint').textContent = hasAnyPosts
      ? 'ลองเปลี่ยนคำค้นหา หรือเปิดกระทู้ใหม่คนแรกเลย!'
      : 'มาเปิดกระทู้แรกของเว็บบอร์ดกันเลย!';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  container.innerHTML = posts.map((p, i) => postCard(p, i, sort)).join('');
}

/* ---------- หน้ารายละเอียดกระทู้ ---------- */

export function renderDetail(post, liked) {
  $('detailCategory').textContent = post.category;
  $('detailTime').textContent = formatTimeThai(post.created_at);
  $('detailAuthor').textContent = post.author;
  $('detailTitle').textContent = post.title;
  $('detailContent').textContent = post.content;
  setCommentCount(post.commentCount);
  renderLikeButton(post.likes, liked);
  document.title = `${post.title} - คุยกัน`;
}

export function setCommentCount(n) {
  $('detailCommentsCount').textContent = n;
}

export function renderLikeButton(likes, liked) {
  $('detailLikes').textContent = likes;
  const icon = $('likeIcon');
  icon.classList.toggle('fa-solid', liked);
  icon.classList.toggle('fa-regular', !liked);
  const btn = $('likeBtn');
  ['text-red-500', 'border-red-200', 'bg-red-50/50'].forEach((c) => btn.classList.toggle(c, liked));
}

// status: 'loading' | 'error' | 'ready'
export function renderComments({ comments = [], status = 'ready' }) {
  const box = $('commentsList');

  if (status === 'loading') {
    box.innerHTML = `<div class="text-center py-6 text-slate-400 text-sm">กำลังโหลดความคิดเห็น…</div>`;
    return;
  }
  if (status === 'error') {
    box.innerHTML = `<div class="text-center py-6 text-red-500 text-sm">โหลดความคิดเห็นไม่สำเร็จ</div>`;
    return;
  }
  if (comments.length === 0) {
    box.innerHTML = `
      <div class="text-center py-8 bg-white rounded-xl border border-slate-200 text-slate-400 text-sm">
        ยังไม่มีใครแสดงความคิดเห็น เป็นคนแรกที่ตอบกระทู้นี้เลย!
      </div>`;
    return;
  }

  box.innerHTML = comments
    .map(
      (c, i) => `
      <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
        <div class="flex items-center justify-between text-xs text-slate-400">
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px]">${i + 1}</span>
            <span class="font-medium text-slate-700">${escapeHtml(c.author)}</span>
          </div>
          <span>${formatTimeThai(c.created_at)}</span>
        </div>
        <div class="text-slate-700 text-sm pl-8 whitespace-pre-line break-words leading-relaxed">${escapeHtml(c.content)}</div>
      </div>`
    )
    .join('');
}

/* ---------- ฟอร์ม / modal / toast ---------- */

export function openCreateModal() {
  $('createModal').classList.remove('hidden');
  $('postTitleInput').focus();
}

export function closeCreateModal() {
  $('createModal').classList.add('hidden');
  $('createPostForm').reset();
  setModalNotice('');
}

export function setModalNotice(message) {
  const el = $('modalNotice');
  el.textContent = message;
  el.classList.toggle('hidden', !message);
}

export function fillNickname(nick) {
  if (!nick) return;
  $('postAuthorInput').value = nick;
  $('commentAuthorInput').value = nick;
}

export function setBusy(button, busy) {
  button.disabled = busy;
  button.classList.toggle('opacity-60', busy);
  button.classList.toggle('pointer-events-none', busy);
}

export function showToast(message, type = 'info') {
  const colors = {
    info: 'bg-slate-800 text-white',
    error: 'bg-red-600 text-white',
    success: 'bg-emerald-600 text-white',
  };
  const el = document.createElement('div');
  el.className = `toast ${colors[type] || colors.info} text-sm px-4 py-2.5 rounded-xl shadow-lg text-center`;
  el.textContent = message;
  $('toastContainer').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}
