'use strict';

var currentGame = null;
var lightboxImages = [];
var lightboxIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('footer-year').textContent = new Date().getFullYear();
    document.addEventListener('keydown', handleLightboxKeys);
    loadGameFromUrl();
});

function getGameIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('id');
    return raw ? (isNaN(Number(raw)) ? raw : Number(raw)) : null;
}

function loadGameFromUrl() {
    const id = getGameIdFromUrl();
    if (!id) {
        renderNotFound();
        return;
    }
    fetch(GAME_DETAIL_URL(id), { cache: 'no-store' })
        .then(resp => { if (!resp.ok) throw new Error('HTTP ' + resp.status); return resp.json(); })
        .then(detail => {
            currentGame = detail;
            renderGame(currentGame);
        })
        .catch(err => {
            console.error('Не удалось загрузить игру ' + id + ':', err);
            renderNotFound();
        });
}

function renderNotFound() {
    document.querySelector('main').innerHTML = `
        <div class="text-center py-24 text-neutral-500">
            <i class="fa-solid fa-ghost text-5xl mb-4"></i>
            <h2 class="text-2xl font-bold text-white mb-2">Игра не найдена</h2>
            <p class="mb-6">Возможно, ссылка устарела или игра была удалена из каталога.</p>
            <a href="index.html" class="inline-block px-6 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-neutral-900 font-bold transition-colors">Вернуться в каталог</a>
        </div>
    `;
}

function renderGame(game) {
    document.title = game.title + ' — SkippyGames';
    document.getElementById('page-title').textContent = game.title + ' — SkippyGames';
    document.getElementById('detail-title').textContent = game.title;
    document.getElementById('detail-genres').textContent = (game.genres || []).join(' • ');
    document.getElementById('detail-desc').textContent = game.description || game.description_short || 'Описание пока недоступно.';

    renderPriceBlock(game);
    renderPlatforms(game);
    renderMedia(game);
    renderScreenshots(game);
    renderUpsells(game);
    updateWishlistDetailIcon();

    window.scrollTo(0, 0);
}

/* =====================================================================
   ЦЕНА — прозрачный расчёт: база + фиксированная наценка 500 ₽
   ===================================================================== */

function renderPriceBlock(game) {
    const priceEl = document.getElementById('detail-price');
    const breakdownEl = document.getElementById('detail-price-breakdown');
    const discountRow = document.getElementById('detail-discount-row');

    if (game.is_free) {
        priceEl.textContent = 'Бесплатно';
        breakdownEl.textContent = '';
        discountRow.classList.add('hidden');
        return;
    }

    priceEl.textContent = formatRub(game.price_rub);

    if (typeof game.base_price_rub === 'number' && typeof game.markup_rub === 'number') {
        breakdownEl.textContent = `Цена в Steam: ${formatRub(game.base_price_rub)} + сервисный сбор ${formatRub(game.markup_rub)} = ${formatRub(game.price_rub)}`;
    } else {
        breakdownEl.textContent = '';
    }

    if (game.discount_percent > 0 && game.original_price_rub) {
        document.getElementById('detail-original-price').textContent = formatRub(game.original_price_rub);
        document.getElementById('detail-discount-badge').textContent = '−' + game.discount_percent + '%';
        discountRow.classList.remove('hidden');
    } else {
        discountRow.classList.add('hidden');
    }
}

function renderPlatforms(game) {
    const html = (game.platforms || []).map(p => {
        const cfg = PLATFORM_ICONS[p] || { icon: 'fa-gamepad', color: 'text-white' };
        let bg = 'bg-neutral-800';
        if (p === 'PC') bg = 'bg-black';
        if (p === 'PlayStation') bg = 'bg-blue-600';
        if (p === 'Xbox') bg = 'bg-green-600';
        if (p === 'Nintendo Switch') bg = 'bg-red-600';
        return `<div class="${bg} px-3 py-1.5 rounded-lg flex items-center gap-2 border border-white/20"><i class="fa-brands ${cfg.icon} text-white"></i><span class="text-xs font-bold text-white">${escapeHtml(PLATFORM_LABELS[p] || p)}</span></div>`;
    }).join('');
    document.getElementById('detail-platforms').innerHTML = html;
}

/* =====================================================================
   ТРЕЙЛЕР: Steam -> YouTube (найден бэкендом) -> честная ссылка на поиск
   ===================================================================== */

function renderMedia(game) {
    const media = document.getElementById('detail-media');

    if (game.trailer_video) {
        media.innerHTML = `
            <video controls preload="metadata" poster="${game.hero || game.cover}" class="w-full h-full object-cover">
                <source src="${game.trailer_video}" type="video/mp4">
                Ваш браузер не поддерживает встроенное видео.
            </video>
        `;
        return;
    }

    if (game.trailer_youtube_id) {
        media.innerHTML = `
            <div class="relative w-full h-full">
                <iframe class="absolute inset-0 w-full h-full"
                        src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(game.trailer_youtube_id)}?rel=0"
                        title="Трейлер ${escapeHtml(game.title)}"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowfullscreen loading="lazy"></iframe>
            </div>
        `;
        return;
    }

    const searchUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(game.title + ' trailer');
    media.innerHTML = `
        <img src="${game.hero || game.cover}" alt="${escapeHtml(game.title)}" class="absolute inset-0 w-full h-full object-cover opacity-70">
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
        <div class="relative z-10 text-center px-6">
            <i class="fa-solid fa-clapperboard text-4xl text-neutral-500 mb-2"></i>
            <p class="text-neutral-400 text-sm mb-3">Трейлер для этой игры пока не найден автоматически</p>
            <a href="${searchUrl}" target="_blank" rel="noopener" class="inline-flex items-center gap-2 text-sm font-semibold text-yellow-500 hover:text-yellow-400 transition-colors">
                <i class="fa-brands fa-youtube"></i> Искать на YouTube
            </a>
        </div>
    `;
}

/* =====================================================================
   СКРИНШОТЫ + ЛАЙТБОКС
   ===================================================================== */

function renderScreenshots(game) {
    const block = document.getElementById('detail-screens-block');
    const container = document.getElementById('detail-screens');
    const screenshots = game.screenshots || [];
    if (screenshots.length === 0) {
        block.classList.add('hidden');
        container.innerHTML = '';
        return;
    }
    block.classList.remove('hidden');
    container.innerHTML = screenshots.map((src, idx) => `
        <img src="${src}" alt="Скриншот ${idx + 1}" loading="lazy"
             class="screenshot-thumb w-full h-28 md:h-36 object-cover rounded-xl border border-neutral-700"
             onclick="openLightbox(${idx})">
    `).join('');
    lightboxImages = screenshots;
}

function openLightbox(index) {
    lightboxIndex = index;
    updateLightboxImage();
    document.getElementById('lightbox').classList.remove('hidden-lightbox');
}
function closeLightbox() { document.getElementById('lightbox').classList.add('hidden-lightbox'); }
function lightboxNav(delta) {
    if (lightboxImages.length === 0) return;
    lightboxIndex = (lightboxIndex + delta + lightboxImages.length) % lightboxImages.length;
    updateLightboxImage();
}
function updateLightboxImage() {
    document.getElementById('lightbox-img').src = lightboxImages[lightboxIndex];
    document.getElementById('lightbox-counter').textContent = (lightboxIndex + 1) + ' / ' + lightboxImages.length;
}
function handleLightboxKeys(e) {
    const lb = document.getElementById('lightbox');
    if (lb.classList.contains('hidden-lightbox')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') lightboxNav(-1);
    if (e.key === 'ArrowRight') lightboxNav(1);
}

/* =====================================================================
   ДОПОЛНЕНИЯ / ВНУТРИИГРОВАЯ ВАЛЮТА
   ===================================================================== */

function renderUpsells(game) {
    const block = document.getElementById('detail-upsells-block');
    const container = document.getElementById('detail-upsells');
    const upsells = game.upsells || [];
    if (upsells.length === 0) {
        block.classList.add('hidden');
        container.innerHTML = '';
        return;
    }
    block.classList.remove('hidden');
    container.innerHTML = upsells.map(item => `
        <div class="bg-neutral-900 rounded-2xl p-4 border border-neutral-700 flex items-center gap-4">
            ${item.cover ? `<img src="${item.cover}" alt="${escapeHtml(item.name)}" class="w-16 h-16 rounded-lg object-cover shrink-0">` : ''}
            <div class="flex-grow min-w-0">
                <p class="text-sm font-bold text-white truncate">${escapeHtml(item.name)}</p>
                <p class="text-yellow-500 font-extrabold">${formatRub(item.price_rub)}</p>
            </div>
            <button onclick='buyUpsell(${JSON.stringify(item.name)}, ${item.price_rub})' class="shrink-0 w-10 h-10 rounded-xl bg-yellow-500 hover:bg-yellow-400 flex items-center justify-center text-neutral-900 transition-colors">
                <i class="fa-solid fa-cart-plus"></i>
            </button>
        </div>
    `).join('');
}

/* =====================================================================
   ПОКУПКА
   ===================================================================== */

function buyGame() {
    if (!currentGame) return;
    const priceLabel = currentGame.is_free ? 'бесплатно' : formatRub(currentGame.price_rub);
    const platformsLabel = (currentGame.platforms || []).map(p => PLATFORM_LABELS[p] || p).join('/');
    const text = `Здравствуйте! Хочу купить игру ${currentGame.title} на платформу ${platformsLabel} (${priceLabel}).`;
    completePurchaseFlow(text);
}

function buyUpsell(name, price) {
    if (!currentGame) return;
    const text = `Здравствуйте! Хочу купить «${name}» для игры ${currentGame.title} за ${price.toLocaleString('ru-RU')} ₽.`;
    completePurchaseFlow(text);
}

/* =====================================================================
   WISHLIST на странице игры
   ===================================================================== */

function updateWishlistDetailIcon() {
    if (!currentGame) return;
    const icon = document.getElementById('wishlistDetailIcon');
    const wished = isInWishlist(currentGame.id);
    icon.classList.toggle('text-red-500', wished);
    icon.classList.toggle('text-neutral-500', !wished);
}
function handleWishlistToggleDetail() {
    if (!currentGame) return;
    toggleWishlist(currentGame.id);
    updateWishlistDetailIcon();
}
