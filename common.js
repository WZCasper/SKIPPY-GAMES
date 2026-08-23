'use strict';

/* =============================================================================
   КОНФИГ
   ============================================================================= */

var VK_GROUP_NUMERIC_ID = 195484236;
var VK_GROUP_ALIAS = 'skippygames';

var GAMES_INDEX_URL = 'data/index.json';
var GAME_DETAIL_URL = (id) => `data/games/${id}.json`;

var PLATFORM_LABELS = { PC: 'Steam', PlayStation: 'PlayStation 5', Xbox: 'Xbox Series X|S', 'Nintendo Switch': 'Nintendo Switch' };
var PLATFORM_SHORT = { PC: 'Steam', PlayStation: 'PS5', Xbox: 'Xbox', 'Nintendo Switch': 'Switch' };
var PLATFORM_ICON_SVG = {
    PC: '🖥️',
    PlayStation: '🎮',
    Xbox: '🟢',
    'Nintendo Switch': '🔴'
};

// Иконки жанров — чисто декоративные, не влияют на данные/фильтрацию.
var GENRE_ICONS = {
    'Экшен': '⚔️', 'Шутеры от первого лица (FPS)': '🎯', 'Шутеры от третьего лица (TPS)': '🔫',
    'Тактические шутеры': '🪖', 'Геройские шутеры': '🦸', 'Файтинги': '🥊', 'Слэшеры': '🗡️',
    "Beat 'em up": '👊', 'Платформеры': '🏃', 'Королевская битва (Battle Royale)': '🏆',
    'Классические ролевые игры (CRPG)': '📖', 'Экшен-РПГ (Action-RPG)': '⚡', 'Японские ролевые игры (JRPG)': '🌸',
    'MMORPG': '🌍', 'Стратегии в реальном времени (RTS)': '🏗️', 'Пошаговые стратегии (TBS)': '♟️',
    'Глобальные стратегии (4X)': '🌐', 'MOBA': '🗺️', 'Башенная защита (Tower Defense)': '🏰',
    'Автобатлеры': '🤖', 'Приключения': '🧭', 'Квесты (Point-and-Click)': '🔍',
    'Интерактивное кино': '🎬', 'Визуальные новеллы': '📚', 'Головоломки': '🧩',
    'Градостроительные симуляторы': '🏙️', 'Экономические симуляторы': '💰', 'Симуляторы жизни': '🌿',
    'Технические симуляторы': '✈️', 'Иммерсивные симуляторы (Immersive Sim)': '🕶️', 'Спортивные симуляторы': '⚽',
    'Гоночные симуляторы (Simracing)': '🏎️', 'Аркадные гонки': '🚗', 'Выживание (Survival)': '🌲',
    'Хорроры на выживание (Survival Horror)': '👻', 'Психологические хорроры': '😱', 'Экшен-адвенчуры': '🗺️',
    'Песочницы (Sandbox)': '🏝️', 'Рогалики (Roguelike/Roguelite)': '🎲', 'Метроидвании': '🦋',
    'Стелс-экшен': '🥷', 'Ритм-игры': '🎵', 'Казуальные игры': '🎈',
};

var ALL_GENRES = Object.keys(GENRE_ICONS);

var WISHLIST_KEY = 'skippygames_wishlist_v1';

/* =============================================================================
   УТИЛИТЫ
   ============================================================================= */

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function formatRub(n) { return n.toLocaleString('ru-RU') + ' ₽'; }
function platformShortBadge(p) {
    return `<span class="plat-badge">${PLATFORM_ICON_SVG[p] || ''}${escapeHtml(PLATFORM_SHORT[p] || p)}</span>`;
}

/* =============================================================================
   WISHLIST (реально в localStorage, без бэкенда) — теперь нормализуем в строки
   ============================================================================= */

function getWishlist() {
    try {
        const raw = localStorage.getItem(WISHLIST_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.map(x => String(x)) : [];
    }
    catch (e) { return []; }
}
function setWishlist(ids) {
    try { localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids.map(x => String(x)))); } catch (e) { /* приватный режим и т.п. */ }
    updateWishlistBadges();
}
function isInWishlist(id) { return getWishlist().includes(String(id)); }
function toggleWishlist(id) {
    const sid = String(id);
    const list = getWishlist();
    const idx = list.indexOf(sid);
    if (idx > -1) list.splice(idx, 1); else list.push(sid);
    setWishlist(list);
    return list.includes(sid);
}
function updateWishlistBadges() {
    const count = getWishlist().length;
    document.querySelectorAll('[data-wishlist-count]').forEach(el => {
        el.textContent = String(count);
        if (el.classList.contains('nav-wish-n')) el.style.display = count ? 'inline' : 'none';
    });
}

/* =============================================================================
   TOAST
   ============================================================================= */

function toast(msg, ok) {
    const wrap = document.getElementById('toast-wrap');
    if (!wrap) return;
    const d = document.createElement('div');
    d.className = 'toast' + (ok ? ' ok' : '');
    d.textContent = msg;
    wrap.appendChild(d);
    setTimeout(() => d.remove(), 2900);
}

/* =============================================================================
   ПОКУПКА: копирование в буфер + открытие чата
   ============================================================================= */

function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    return Promise.resolve(fallbackCopy(text));
}
function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) { /* буфер обмена недоступен */ }
    document.body.removeChild(ta);
}
function completePurchaseFlow(text) {
    copyToClipboard(text);
    toast('✓ Текст заказа скопирован — вставьте в чат (Ctrl+V)', true);
    openChat();
}

/* =============================================================================
   ЧАТ: гарантированно рабочие прямые ссылки VK/Telegram
   ============================================================================= */

function openChat() {
    const w = document.getElementById('chatWin');
    if (w) w.classList.add('open');
}
function toggleChatWin() {
    const w = document.getElementById('chatWin');
    if (!w) return;
    w.classList.toggle('open');
}

/* =============================================================================
   МОБИЛЬНОЕ МЕНЮ / BACK-TO-TOP / SCROLL SPY
   ============================================================================= */

function initMobileMenu() {
    const btn = document.getElementById('hamburger'), nav = document.getElementById('mobileNav');
    if (!btn || !nav) return;
    btn.addEventListener('click', () => {
        const open = nav.classList.toggle('open');
        const s = btn.querySelectorAll('span');
        if (open) { s[0].style.transform = 'translateY(6px) rotate(45deg)'; s[1].style.opacity = '0'; s[2].style.transform = 'translateY(-6px) rotate(-45deg)'; }
        else s.forEach(x => { x.style.transform = ''; x.style.opacity = ''; });
    });
    document.addEventListener('click', e => {
        if (!btn.contains(e.target) && !nav.contains(e.target)) {
            nav.classList.remove('open');
            btn.querySelectorAll('span').forEach(x => { x.style.transform = ''; x.style.opacity = ''; });
        }
    });
}
function closeMobileNav() {
    document.getElementById('mobileNav')?.classList.remove('open');
    document.getElementById('hamburger')?.querySelectorAll('span').forEach(x => { x.style.transform = ''; x.style.opacity = ''; });
}
function initBackToTop() {
    const btn = document.getElementById('toTop');
    if (!btn) return;
    window.addEventListener('scroll', () => btn.classList.toggle('visible', window.scrollY > 400), { passive: true });
}
function initScrollSpy(ids) {
    const links = document.querySelectorAll('.nav-links a');
    if (!links.length) return;
    window.addEventListener('scroll', () => {
        let cur = '';
        ids.forEach(id => { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top <= 80) cur = id; });
        links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + cur));
    }, { passive: true });
}

/* =============================================================================
   ВЛАДЕЛЕЦ: реальный аватар YouTube-канала через unavatar.io, с fallback
   ============================================================================= */

function loadOwnerAvatar() {
    const targets = [document.getElementById('ownerAv'), document.getElementById('logoIcon')].filter(Boolean);
    if (targets.length === 0) return;
    const img = new Image();
    img.alt = 'SkippyGames';
    img.onload = () => {
        targets.forEach(el => {
            const clone = img.cloneNode();
            el.innerHTML = '';
            el.appendChild(clone);
        });
    };
    img.onerror = () => { /* остаются SVG-заглушки, уже в разметке */ };
    img.src = 'https://unavatar.io/youtube/SkippyGames';
}

document.addEventListener('DOMContentLoaded', () => {
    updateWishlistBadges();
    initMobileMenu();
    initBackToTop();
    loadOwnerAvatar();
    document.getElementById('chatToggle')?.addEventListener('click', toggleChatWin);
    document.getElementById('chatClose')?.addEventListener('click', () => document.getElementById('chatWin')?.classList.remove('open'));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') document.getElementById('chatWin')?.classList.remove('open'); });
});
