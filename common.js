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
    PC: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.029 4.524 4.524s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0z"/></svg>',
    PlayStation: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.984 2.596v14.347l3.67 1.066V6.208c0-.67.295-1.136.77-.98.608.19.73.814.73 1.483v5.995c2.746 1.369 4.802-.07 4.802-3.718 0-3.746-1.3-5.25-5.164-6.545-1.03-.35-2.817-.8-4.808-1.847zM2 17.33l6.362 2.17c4.45 1.516 9.162-.052 9.162-4.983v-.078c0-.592-.072-1.156-.21-1.69l-3.588-1.032v4.485c0 .67-.295 1.136-.77.98-.608-.19-.73-.814-.73-1.483v-4.33L6.83 9.6C4.604 10.96 2 12.58 2 17.33z"/></svg>',
    Xbox: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.018 4.84c.546-.625 2.056-1.75 5.982-1.75s5.436 1.125 5.982 1.75c-5.982-4.36-11.964 0-11.964 0zM12 2c-5.523 0-10 4.477-10 10s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-3.05 14.06c-2.456-2.888-3.282-5.62-2.812-7.562C7.02 8.43 9.148 7 12 7s4.98 1.43 5.862 1.498c.47 1.942-.356 4.674-2.812 7.562C13.684 17.573 12 18 12 18s-1.684-.427-3.05-1.94z"/></svg>',
    'Nintendo Switch': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 2C4.24 2 2 4.24 2 7v10c0 2.76 2.24 5 5 5 2.76 0 5-2.24 5-5V7c0-2.76-2.24-5-5-5zm0 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM17 2a5 5 0 0 0-5 5v10a5 5 0 0 0 5 5 5 5 0 0 0 5-5V7a5 5 0 0 0-5-5zm0 15a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/></svg>',
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

var MANAGER_AVATARS = [
    { name: 'Дежурный №1', url: 'https://placehold.co/100x100/0c0c1a/00e5ff?text=01' },
    { name: 'Дежурный №2', url: 'https://placehold.co/100x100/0c0c1a/00e5ff?text=02' },
    { name: 'Дежурный №3', url: 'https://placehold.co/100x100/0c0c1a/00e5ff?text=03' },
    { name: 'Дежурный №4', url: 'https://placehold.co/100x100/0c0c1a/00e5ff?text=04' },
    { name: 'Дежурный №5', url: 'https://placehold.co/100x100/0c0c1a/00e5ff?text=05' },
    { name: 'Дежурный №6', url: 'https://placehold.co/100x100/0c0c1a/00e5ff?text=06' },
    { name: 'Дежурный №7', url: 'https://placehold.co/100x100/0c0c1a/00e5ff?text=07' },
];

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
   WISHLIST (реально в localStorage, без бэкенда)
   ============================================================================= */

function getWishlist() {
    try { const raw = localStorage.getItem(WISHLIST_KEY); return raw ? JSON.parse(raw) : []; }
    catch (e) { return []; }
}
function setWishlist(ids) {
    try { localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids)); } catch (e) { /* приватный режим и т.п. */ }
    updateWishlistBadges();
}
function isInWishlist(id) { return getWishlist().includes(id); }
function toggleWishlist(id) {
    const list = getWishlist();
    const idx = list.indexOf(id);
    if (idx > -1) list.splice(idx, 1); else list.push(id);
    setWishlist(list);
    return list.includes(id);
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
   ЧАТ: гарантированно рабочие прямые ссылки VK/Telegram + опциональный
   встроенный виджет ВК как бонус (см. README про причины такого подхода)
   ============================================================================= */

function setupChatAvatar() {
    const dayOfWeek = new Date().getDay();
    const manager = MANAGER_AVATARS[dayOfWeek % MANAGER_AVATARS.length];
    const headImg = document.getElementById('chat-av-img');
    const nameEl = document.getElementById('ch-name');
    if (headImg) headImg.src = manager.url;
    if (nameEl) nameEl.textContent = manager.name;
}

function openChat() {
    const w = document.getElementById('chatWin');
    if (w) w.classList.add('open');
    mountVkWidget();
}
function toggleChatWin() {
    const w = document.getElementById('chatWin');
    if (!w) return;
    w.classList.toggle('open');
    if (w.classList.contains('open')) mountVkWidget();
}

var vkWidgetMounted = false;
var vkWidgetCheckTimer = null;

function renderVkFallback(reason) {
    const el = document.getElementById('vk_community_messages');
    if (!el) return;
    console.warn('Встроенный виджет VK не поднялся (' + reason + '). Прямые кнопки VK/Telegram выше по-прежнему работают.');
    el.innerHTML = `<div class="chat-embed-note">Встроенный чат сейчас недоступен в этом браузере — кнопки выше работают точно.<br><button onclick="retryVkWidget()">Попробовать снова</button></div>`;
}
function retryVkWidget() {
    vkWidgetMounted = false;
    const el = document.getElementById('vk_community_messages');
    if (el) el.innerHTML = '';
    mountVkWidget();
}
function mountVkWidget() {
    if (vkWidgetMounted) return;
    vkWidgetMounted = true;
    const container = document.getElementById('vk_community_messages');
    if (!container) return;
    container.innerHTML = '<div class="chat-embed-note">Загружаем встроенный чат...</div>';
    loadVkScript((loaded) => {
        if (!loaded || !window.VK || !window.VK.Widgets || !window.VK.Widgets.CommunityMessages) {
            renderVkFallback('скрипт VK не загрузился'); return;
        }
        try {
            window.VK.Widgets.CommunityMessages('vk_community_messages', VK_GROUP_NUMERIC_ID, { expandTimeout: 200, tooltipButtonText: 'Написать нам' });
        } catch (err) {
            console.error('VK.Widgets.CommunityMessages выбросил ошибку:', err);
            renderVkFallback('ошибка инициализации виджета'); return;
        }
        clearTimeout(vkWidgetCheckTimer);
        vkWidgetCheckTimer = setTimeout(() => {
            if (!container.querySelector('iframe')) renderVkFallback('виджет не ответил вовремя');
        }, 6000);
    });
}
function loadVkScript(callback) {
    if (window.VK && window.VK.Widgets) { callback(true); return; }
    const script = document.createElement('script');
    script.src = 'https://vk.com/js/api/openapi.js';
    script.async = true;
    const timeoutId = setTimeout(() => callback(false), 8000);
    script.onload = () => { clearTimeout(timeoutId); callback(true); };
    script.onerror = () => { clearTimeout(timeoutId); callback(false); };
    document.head.appendChild(script);
}
window.addEventListener('load', () => {
    setTimeout(() => { if (!window.VK || !window.VK.Widgets) loadVkScript(() => {}); }, 1500);
});

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
    const av = document.getElementById('ownerAv');
    if (!av) return;
    const img = new Image();
    img.alt = 'SkippyGames';
    img.onload = () => { av.innerHTML = ''; av.appendChild(img); };
    img.onerror = () => { /* остаётся SVG-заглушка с инициалами, уже в разметке */ };
    img.src = 'https://unavatar.io/youtube/SkippyGames';
}

document.addEventListener('DOMContentLoaded', () => {
    setupChatAvatar();
    updateWishlistBadges();
    initMobileMenu();
    initBackToTop();
    loadOwnerAvatar();
    document.getElementById('chatToggle')?.addEventListener('click', toggleChatWin);
    document.getElementById('chatClose')?.addEventListener('click', () => document.getElementById('chatWin')?.classList.remove('open'));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') document.getElementById('chatWin')?.classList.remove('open'); });
});
