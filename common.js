'use strict';

/* =============================================================================
   ОБЩИЙ КОНФИГ
   ============================================================================= */

var VK_GROUP_NUMERIC_ID = 195484236;
var VK_GROUP_ALIAS = 'skippygames';

var GAMES_INDEX_URL = 'data/index.json';
var CURRENCY_URL = 'data/currency.json';
var GAME_DETAIL_URL = (id) => `data/games/${id}.json`;

var PLATFORM_LABELS = { 'PC': 'Steam (PC)', 'PlayStation': 'PlayStation', 'Xbox': 'Xbox', 'Nintendo Switch': 'Nintendo Switch' };
var PLATFORM_ICONS = {
    'PC': { icon: 'fa-steam', color: 'text-neutral-300' },
    'PlayStation': { icon: 'fa-playstation', color: 'text-blue-400' },
    'Xbox': { icon: 'fa-xbox', color: 'text-green-400' },
    'Nintendo Switch': { icon: 'fa-gamepad', color: 'text-red-400' }
};

var MANAGER_AVATARS = [
    { name: 'Дежурный №1', url: 'https://placehold.co/100x100/1d4ed8/ffffff?text=01' },
    { name: 'Дежурный №2', url: 'https://placehold.co/100x100/1d4ed8/ffffff?text=02' },
    { name: 'Дежурный №3', url: 'https://placehold.co/100x100/1d4ed8/ffffff?text=03' },
    { name: 'Дежурный №4', url: 'https://placehold.co/100x100/1d4ed8/ffffff?text=04' },
    { name: 'Дежурный №5', url: 'https://placehold.co/100x100/1d4ed8/ffffff?text=05' },
    { name: 'Дежурный №6', url: 'https://placehold.co/100x100/1d4ed8/ffffff?text=06' },
    { name: 'Дежурный №7', url: 'https://placehold.co/100x100/1d4ed8/ffffff?text=07' }
];

var WISHLIST_KEY = 'skippygames_wishlist_v1';

/* =============================================================================
   УТИЛИТЫ
   ============================================================================= */

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatRub(n) {
    return n.toLocaleString('ru-RU') + ' ₽';
}

function platformIconHtml(p) {
    const cfg = PLATFORM_ICONS[p] || { icon: 'fa-gamepad', color: 'text-neutral-300' };
    return `<i class="fa-brands ${cfg.icon} ${cfg.color}" title="${escapeHtml(PLATFORM_LABELS[p] || p)}"></i>`;
}

/* =============================================================================
   WISHLIST (localStorage, полностью на клиенте — без бэкенда)
   ============================================================================= */

function getWishlist() {
    try {
        const raw = localStorage.getItem(WISHLIST_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function setWishlist(ids) {
    try {
        localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
    } catch (e) { /* localStorage недоступен (приватный режим и т.п.) — тихо игнорируем */ }
    updateWishlistBadge();
}

function isInWishlist(id) {
    return getWishlist().includes(id);
}

function toggleWishlist(id) {
    const list = getWishlist();
    const idx = list.indexOf(id);
    if (idx > -1) list.splice(idx, 1);
    else list.push(id);
    setWishlist(list);
    return list.includes(id);
}

function updateWishlistBadge() {
    const count = getWishlist().length;
    document.querySelectorAll('[data-wishlist-count]').forEach(el => { el.textContent = String(count); });
}

/* =============================================================================
   TOAST-УВЕДОМЛЕНИЯ
   ============================================================================= */

function showToast(title, text) {
    const container = document.getElementById('toast');
    if (!container) return;
    const titleEl = document.getElementById('toast-title');
    const textEl = document.getElementById('toast-text');
    if (titleEl) titleEl.textContent = title;
    if (textEl) textEl.textContent = text;
    container.classList.add('show');
    setTimeout(() => container.classList.remove('show'), 6000);
}

/* =============================================================================
   ПОКУПКА: копирование в буфер + открытие чата
   ============================================================================= */

function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    }
    return Promise.resolve(fallbackCopy(text));
}

function fallbackCopy(text) {
    const tempInput = document.createElement('textarea');
    tempInput.value = text;
    tempInput.style.position = 'fixed';
    tempInput.style.opacity = '0';
    document.body.appendChild(tempInput);
    tempInput.select();
    try { document.execCommand('copy'); } catch (e) { /* буфер обмена недоступен — ничего не поделать */ }
    document.body.removeChild(tempInput);
}

function completePurchaseFlow(text) {
    copyToClipboard(text);
    showToast('Текст заказа скопирован!', 'Нажмите Ctrl+V (или «Вставить») в открывшемся чате, чтобы отправить заказ администратору.');
    const chatWidget = document.getElementById('chat-widget');
    if (chatWidget && chatWidget.classList.contains('closed')) toggleChat();
}

/* =============================================================================
   ЧАТ ВКОНТАКТЕ (реальный виджет с диагностикой и запасным вариантом)
   ============================================================================= */

var vkWidgetMounted = false;
var vkWidgetCheckTimer = null;
var VK_SCRIPT_LOAD_TIMEOUT_MS = 8000;
var VK_WIDGET_RENDER_TIMEOUT_MS = 6000;

function setupChatAvatar() {
    const dayOfWeek = new Date().getDay();
    const manager = MANAGER_AVATARS[dayOfWeek % MANAGER_AVATARS.length];
    const chatAvatar = document.getElementById('chat-avatar');
    const toggleAvatar = document.getElementById('chat-toggle-avatar');
    const nameEl = document.getElementById('chat-manager-name');
    if (chatAvatar) chatAvatar.src = manager.url;
    if (toggleAvatar) toggleAvatar.src = manager.url;
    if (nameEl) nameEl.textContent = manager.name;
}

function toggleChat() {
    const chatWidget = document.getElementById('chat-widget');
    if (!chatWidget) return;
    chatWidget.classList.toggle('closed');
    if (!chatWidget.classList.contains('closed')) {
        mountVkWidget();
    }
}

function renderVkFallback(reason) {
    const el = document.getElementById('vk_community_messages');
    if (!el) return;
    el.innerHTML = `
        <div class="p-6 text-center text-sm text-neutral-600 flex flex-col items-center gap-3">
            <i class="fa-brands fa-vk text-3xl text-blue-600"></i>
            <p>Не удалось загрузить чат ВКонтакте${reason ? ' (' + escapeHtml(reason) + ')' : ''}.</p>
            <p class="text-neutral-500 text-xs">Обычно причина — блокировщик рекламы в браузере блокирует скрипты vk.com, либо домен сайта не подтверждён в настройках виджета сообщества.</p>
            <div class="flex gap-2 flex-wrap justify-center">
                <a href="https://vk.com/${VK_GROUP_ALIAS}" target="_blank" rel="noopener" class="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-500 transition-colors">Написать в VK напрямую</a>
                <a href="https://t.me/SKIPPYManager" target="_blank" rel="noopener" class="px-3 py-1.5 rounded-lg bg-sky-500 text-white font-semibold text-xs hover:bg-sky-400 transition-colors">Написать в Telegram</a>
            </div>
            <button onclick="retryVkWidget()" class="text-xs text-neutral-500 hover:text-neutral-800 underline">Попробовать снова</button>
        </div>
    `;
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
    container.innerHTML = '<div class="p-6 text-center text-neutral-500 text-sm"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Подключаем чат ВКонтакте...</div>';

    loadVkScript((loaded) => {
        if (!loaded || !window.VK || !window.VK.Widgets || !window.VK.Widgets.CommunityMessages) {
            renderVkFallback('скрипт VK не загрузился');
            return;
        }
        try {
            window.VK.Widgets.CommunityMessages('vk_community_messages', VK_GROUP_NUMERIC_ID, {
                expandTimeout: 200,
                tooltipButtonText: 'Написать нам'
            });
        } catch (err) {
            console.error('VK.Widgets.CommunityMessages выбросил ошибку:', err);
            renderVkFallback('ошибка инициализации виджета');
            return;
        }

        clearTimeout(vkWidgetCheckTimer);
        vkWidgetCheckTimer = setTimeout(() => {
            if (!container.querySelector('iframe')) {
                console.warn('VK.Widgets.CommunityMessages не создал iframe за ' + VK_WIDGET_RENDER_TIMEOUT_MS + 'мс — проверьте "Разрешённые домены" виджета в настройках сообщества ВК, либо отключите блокировщик рекламы для проверки.');
                renderVkFallback('виджет не ответил вовремя');
            }
        }, VK_WIDGET_RENDER_TIMEOUT_MS);
    });
}

function loadVkScript(callback) {
    if (window.VK && window.VK.Widgets) {
        callback(true);
        return;
    }
    const script = document.createElement('script');
    script.src = 'https://vk.com/js/api/openapi.js';
    script.async = true;

    const timeoutId = setTimeout(() => {
        console.warn('Скрипт VK openapi.js не загрузился за ' + VK_SCRIPT_LOAD_TIMEOUT_MS + 'мс (возможно, заблокирован блокировщиком рекламы или недоступен VK.com).');
        callback(false);
    }, VK_SCRIPT_LOAD_TIMEOUT_MS);

    script.onload = () => { clearTimeout(timeoutId); callback(true); };
    script.onerror = () => { clearTimeout(timeoutId); callback(false); };
    document.head.appendChild(script);
}

// Прогреваем скрипт VK в фоне через ~1.5с после загрузки страницы, чтобы
// к моменту клика по кнопке чата он уже был готов (без гонки состояний).
window.addEventListener('load', () => {
    setTimeout(() => {
        if (!window.VK || !window.VK.Widgets) {
            loadVkScript(() => { /* просто прогрев — реальный mount произойдёт при открытии чата */ });
        }
    }, 1500);
});

document.addEventListener('DOMContentLoaded', () => {
    setupChatAvatar();
    updateWishlistBadge();
});
