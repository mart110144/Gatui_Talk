// ตัวควบคุมหลัก: state, การสลับหน้า (hash routing), event ทั้งหมด
import {
  CATEGORIES,
  LIMITS,
  COOLDOWN_MS,
  STORAGE_KEYS,
  DEFAULT_POST_AUTHOR,
  DEFAULT_COMMENT_AUTHOR,
  isConfigured,
} from './config.js';
import * as api from './api.js';
import * as ui from './ui.js';
import { $, storage } from './utils.js';

const state = {
  posts: [],
  status: 'loading', // 'loading' | 'error' | 'ready'
  sort: 'trending',
  category: 'all',
  search: '',
  currentPost: null,
  comments: [],
  liked: new Set(storage.get(STORAGE_KEYS.liked, [])),
  liking: false,
};

/* ============================================================
   หน้ารวมกระทู้
   ============================================================ */

const byNewest = (a, b) => new Date(b.created_at) - new Date(a.created_at);

function visiblePosts() {
  const q = state.search.toLowerCase();
  const list = state.posts.filter((p) => {
    const matchCategory = state.category === 'all' || p.category === state.category;
    const matchSearch =
      !q || [p.title, p.content, p.author].some((t) => t.toLowerCase().includes(q));
    return matchCategory && matchSearch;
  });

  list.sort(
    state.sort === 'trending'
      ? (a, b) => b.commentCount - a.commentCount || byNewest(a, b)
      : byNewest
  );
  return list;
}

function renderFeed() {
  ui.renderFeed({
    posts: visiblePosts(),
    sort: state.sort,
    status: state.status,
    hasAnyPosts: state.posts.length > 0,
  });
}

async function loadPosts({ silent = false } = {}) {
  if (!isConfigured) return;

  if (!silent || state.posts.length === 0) {
    state.status = 'loading';
    renderFeed();
  }

  try {
    state.posts = await api.fetchPosts();
    state.status = 'ready';
  } catch (err) {
    console.error('โหลดกระทู้ไม่สำเร็จ', err);
    if (state.posts.length === 0) state.status = 'error';
    else if (!silent) ui.showToast('รีเฟรชกระทู้ไม่สำเร็จ', 'error');
  }
  renderFeed();
}

/* ============================================================
   Routing  (#post=<uuid> = หน้ากระทู้, ว่าง = หน้ารวม)
   ============================================================ */

const POST_HASH = /^#post=([0-9a-fA-F-]{36})$/;

function route() {
  const match = location.hash.match(POST_HASH);
  if (match) showPost(match[1]);
  else showHome();
}

function goHome() {
  if (location.hash && location.hash !== '#') location.hash = '';
  else showHome();
}

function showHome() {
  state.currentPost = null;
  state.comments = [];
  ui.showView('home');
  renderFeed();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  loadPosts({ silent: true }); // ดึงกระทู้ใหม่ของคนอื่นเงียบๆ
}

async function showPost(id) {
  if (!isConfigured) return showHome();

  let post = state.posts.find((p) => p.id === id);

  if (!post) {
    try {
      post = await api.fetchPost(id);
    } catch (err) {
      console.error(err);
    }
    if (!post) {
      ui.showToast('ไม่พบกระทู้นี้ (อาจถูกลบไปแล้ว)', 'error');
      goHome();
      return;
    }
  }

  state.currentPost = post;
  state.comments = [];
  ui.showView('detail');
  ui.renderDetail(post, state.liked.has(id));
  ui.renderComments({ status: 'loading' });
  window.scrollTo({ top: 0, behavior: 'smooth' });

  try {
    const comments = await api.fetchComments(id);
    if (state.currentPost?.id !== id) return; // ผู้ใช้เปลี่ยนหน้าไปแล้ว
    state.comments = comments;
    post.commentCount = comments.length;
    ui.setCommentCount(comments.length);
    ui.renderComments({ comments });
  } catch (err) {
    console.error(err);
    if (state.currentPost?.id === id) ui.renderComments({ status: 'error' });
  }
}

/* ============================================================
   Actions
   ============================================================ */

function cooldownLeft(key) {
  const last = storage.get(key, 0);
  return Math.max(0, COOLDOWN_MS - (Date.now() - last));
}

function rememberNickname(nick) {
  storage.set(STORAGE_KEYS.nickname, nick);
  ui.fillNickname(nick);
}

async function handleCreatePost(event) {
  event.preventDefault();
  if (!isConfigured) return ui.setModalNotice('ยังไม่ได้ตั้งค่าฐานข้อมูล (ดู README.md)');

  // Honeypot: ถ้ามีคนกรอกช่องที่ซ่อนไว้ = บอท → ทำเป็นสำเร็จเฉยๆ
  if ($('postWebsiteInput').value) return ui.closeCreateModal();

  const title = $('postTitleInput').value.trim();
  const content = $('postContentInput').value.trim();
  const category = $('postCategoryInput').value;
  const author = $('postAuthorInput').value.trim() || DEFAULT_POST_AUTHOR;

  if (!title || !content) return ui.setModalNotice('กรุณากรอกหัวข้อและเนื้อหากระทู้ให้ครบถ้วน');
  if (!CATEGORIES.some((c) => c.value === category)) return ui.setModalNotice('หมวดหมู่ไม่ถูกต้อง');
  if (title.length > LIMITS.title) return ui.setModalNotice(`หัวข้อยาวเกิน ${LIMITS.title} ตัวอักษร`);
  if (content.length > LIMITS.content) return ui.setModalNotice(`เนื้อหายาวเกิน ${LIMITS.content} ตัวอักษร`);
  if (author.length > LIMITS.author) return ui.setModalNotice(`นามแฝงยาวเกิน ${LIMITS.author} ตัวอักษร`);

  const wait = cooldownLeft(STORAGE_KEYS.lastPostAt);
  if (wait > 0) return ui.setModalNotice(`โพสต์ถี่เกินไป รออีก ${Math.ceil(wait / 1000)} วินาที`);

  const btn = $('postSubmitBtn');
  ui.setBusy(btn, true);
  try {
    const created = await api.createPost({ title, category, author, content });
    storage.set(STORAGE_KEYS.lastPostAt, Date.now());
    rememberNickname(author);
    state.posts.unshift(created);
    ui.closeCreateModal();
    ui.fillNickname(storage.get(STORAGE_KEYS.nickname, ''));
    location.hash = `#post=${created.id}`;
  } catch (err) {
    console.error(err);
    ui.setModalNotice('เผยแพร่กระทู้ไม่สำเร็จ ลองใหม่อีกครั้ง');
  } finally {
    ui.setBusy(btn, false);
  }
}

async function handleSubmitComment(event) {
  event.preventDefault();
  const post = state.currentPost;
  if (!post || !isConfigured) return;

  if ($('commentWebsiteInput').value) return; // บอท

  const textInput = $('commentTextInput');
  const content = textInput.value.trim();
  const author = $('commentAuthorInput').value.trim() || DEFAULT_COMMENT_AUTHOR;

  if (!content) return textInput.focus();
  if (content.length > LIMITS.comment) return ui.showToast(`ความคิดเห็นยาวเกิน ${LIMITS.comment} ตัวอักษร`, 'error');
  if (author.length > LIMITS.author) return ui.showToast(`ชื่อยาวเกิน ${LIMITS.author} ตัวอักษร`, 'error');

  const wait = cooldownLeft(STORAGE_KEYS.lastCommentAt);
  if (wait > 0) return ui.showToast(`ส่งถี่เกินไป รออีก ${Math.ceil(wait / 1000)} วินาที`, 'error');

  const btn = $('commentSubmitBtn');
  ui.setBusy(btn, true);
  try {
    const created = await api.createComment({ postId: post.id, author, content });
    storage.set(STORAGE_KEYS.lastCommentAt, Date.now());
    rememberNickname(author);

    if (state.currentPost?.id === post.id) {
      state.comments.push(created);
      post.commentCount = state.comments.length;
      ui.setCommentCount(post.commentCount);
      ui.renderComments({ comments: state.comments });
    }
    textInput.value = '';
  } catch (err) {
    console.error(err);
    ui.showToast('ส่งความคิดเห็นไม่สำเร็จ ลองใหม่อีกครั้ง', 'error');
  } finally {
    ui.setBusy(btn, false);
  }
}

async function toggleLike() {
  const post = state.currentPost;
  if (!post || state.liking || !isConfigured) return;

  state.liking = true;
  const wasLiked = state.liked.has(post.id);
  try {
    post.likes = wasLiked ? await api.unlikePost(post.id) : await api.likePost(post.id);
    if (wasLiked) state.liked.delete(post.id);
    else state.liked.add(post.id);
    storage.set(STORAGE_KEYS.liked, [...state.liked]);
    ui.renderLikeButton(post.likes, state.liked.has(post.id));
  } catch (err) {
    console.error(err);
    ui.showToast('กดถูกใจไม่สำเร็จ ลองใหม่อีกครั้ง', 'error');
  } finally {
    state.liking = false;
  }
}

function setSearch(value) {
  state.search = value.trim();
  ui.setClearSearchVisible(Boolean(state.search));
  renderFeed();
}

/* ============================================================
   Event wiring
   ============================================================ */

function handleClick(event) {
  const el = event.target.closest('[data-action]');
  if (!el) return;

  switch (el.dataset.action) {
    case 'home':
      event.preventDefault();
      goHome();
      break;
    case 'open-create':
      ui.openCreateModal();
      break;
    case 'close-create':
      ui.closeCreateModal();
      ui.fillNickname(storage.get(STORAGE_KEYS.nickname, ''));
      break;
    case 'backdrop-close':
      if (event.target === el) {
        ui.closeCreateModal();
        ui.fillNickname(storage.get(STORAGE_KEYS.nickname, ''));
      }
      break;
    case 'category':
      state.category = el.dataset.category;
      ui.renderCategoryPills(state.category);
      renderFeed();
      break;
    case 'sort':
      state.sort = el.dataset.sort;
      ui.renderSortTabs(state.sort);
      renderFeed();
      break;
    case 'clear-search':
      $('searchInput').value = '';
      setSearch('');
      break;
    case 'open-post':
      location.hash = `#post=${el.dataset.id}`;
      break;
    case 'like':
      toggleLike();
      break;
    case 'retry':
      loadPosts();
      break;
  }
}

function init() {
  ui.renderCategoryPills(state.category);
  ui.renderCategoryOptions();
  ui.renderSortTabs(state.sort);
  ui.fillNickname(storage.get(STORAGE_KEYS.nickname, ''));

  // ใส่ maxlength ตามค่าใน config
  $('postTitleInput').maxLength = LIMITS.title;
  $('postContentInput').maxLength = LIMITS.content;
  $('postAuthorInput').maxLength = LIMITS.author;
  $('commentTextInput').maxLength = LIMITS.comment;
  $('commentAuthorInput').maxLength = LIMITS.author;

  document.addEventListener('click', handleClick);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') ui.closeCreateModal();
    if (e.key === 'Enter' && e.target.matches?.('[data-action="open-post"]')) {
      location.hash = `#post=${e.target.dataset.id}`;
    }
  });

  $('searchInput').addEventListener('input', (e) => setSearch(e.target.value));
  $('createPostForm').addEventListener('submit', handleCreatePost);
  $('commentForm').addEventListener('submit', handleSubmitComment);
  window.addEventListener('hashchange', route);

  if (!isConfigured) {
    ui.setConfigNoticeVisible(true);
    state.status = 'ready';
    renderFeed();
    return;
  }

  route();
}

init();
