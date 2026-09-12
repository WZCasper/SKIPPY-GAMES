'use strict';

var currentGame = null;
var lightboxImages = [];
var lightboxIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('footYear').textContent = new Date().getFullYear();
    document.getElementById('lbClose').addEventListener('click', closeLightbox);
    document.getElementById('lbPrev').addEventListener('click', () => lightboxNav(-1));
    document.getElementById('lbNext').addEventListener('click', () => lightboxNav(1));
    document.getElementById('lightbox').addEventListener('click', e => { if (e.target.id === 'lightbox') closeLightbox(); });
    document.addEventListener('keydown', handleLightboxKeys);
    loadGame();
});

function getGameIdFromUrl() {
    const p = new URLSearchParams(window.location.search);
    const raw = p.get('id');
    return raw ? raw : null; // always return string id (can be numeric-string or ns...)
}

function loadGame() {
    const id = getGameIdFromUrl();
    if (!id) { renderNotFound(); return; }
    fetch(GAME_DETAIL_URL(id), { cache: 'no-store' })
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(g => { if (g && typeof g.id !== 'string') g.id = String(g.id); currentGame = g; renderGame(g); })
        .catch(err => { console.error('Не удалось загрузить игру ' + id + ':', err); renderNotFound(); });
}

function renderNotFound() {
    document.getElementById('gameContent').innerHTML = `
        <div class="no-results" style="padding:4rem 1rem">
            👻 Игра не найдена.<br><a href="index.html" style="color:var(--cyan);text-decoration:none;font-weight:700">Вернуться в каталог</a>
        </div>`;
}

function renderGame(g) {
    document.title = g.title + ' — SkippyGames';
    document.getElementById('pageTitle').textContent = g.title + ' — SkippyGames';

    const plats = (g.platforms || []).map(p => `<span class="g-plat-badge">${PLATFORM_ICON_SVG[p] || ''} ${escapeHtml(PLATFORM_LABELS[p] || p)}</span>`).join('');
    const genres = (g.genres || []).join(' • ');
    const wished = isInWishlist(g.id);

    document.getElementById('gameContent').innerHTML = `
        <div class="hero-wrap">
            <div class="game-hero" id="gameHero"></div>
            <button class="hero-wish${wished ? ' wished' : ''}" id="wishBtn" title="В избранное">♥</button>
        </div>
        <div id="galleryWrap"></div>
        <div class="game-body">
            <div class="g-plat">${plats}</div>
            <h1 class="g-title">${escapeHtml(g.title)}</h1>
            <div class="g-genre">${escapeHtml(genres)}</div>
            <div class="g-desc">${escapeHtml(g.description || g.description_short || 'Описание пока недоступно.')}</div>
            <div class="g-price-card" id="priceCard"></div>
            <div id="upsellsSection"></div>
        </div>
    `;

    renderHero(g);
    renderGallery(g);
    renderPriceCard(g);
    renderUpsells(g);

    document.getElementById('wishBtn').addEventListener('click', () => {
        const now = toggleWishlist(g.id);
        document.getElementById('wishBtn').classList.toggle('wished', now);
    });

    window.scrollTo(0, 0);
}

/* =====================================================================
   ТРЕЙЛЕР: Steam → YouTube (найден бэкендом) → честная ссылка на поиск
   ===================================================================== */

function renderHero(g) {
    const hero = document.getElementById('gameHero');
    if (g.trailer_video) {
        hero.innerHTML = `<video controls preload="metadata" poster="${escapeHtml(g.hero || g.cover)}"><source src="${escapeHtml(g.trailer_video)}" type="video/mp4"></video>`;
        return;
    }
    if (g.trailer_youtube_id) {
        hero.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(g.trailer_youtube_id)}?rel=0" title="Трейлер ${escapeHtml(g.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" frameborder="0" allowfullscreen></iframe>`;
        return;
    }
    const searchUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(g.title + ' trailer');
    hero.innerHTML = `
        <img src="${escapeHtml(g.hero || g.cover)}" alt="${escapeHtml(g.title)}" style="opacity:.55">
        <div class="game-hero-grad"></div>
        <div class="game-hero-fallback" style="position:absolute;inset:0;">
            <div>🎬 Трейлер не найден автоматически</div>
            <a href="${searchUrl}" target="_blank" rel="noopener">Искать на YouTube →</a>
        </div>`;
}

/* =====================================================================
   ГАЛЕРЕЯ + ЛАЙТБОКС
   ===================================================================== */

function renderGallery(g) {
    const wrap = document.getElementById('galleryWrap');
    const shots = g.screenshots || [];
    if (shots.length === 0) { wrap.innerHTML = ''; lightboxImages = []; return; }

    const galleryHtml = `<div class="game-gallery">${shots.map((src, i) => `<img class="gallery-thumb" data-index="${i}" src="${escapeHtml(src)}" alt="Скриншот ${i + 1}" loading="lazy">`).join('')}</div>`;
    wrap.innerHTML = galleryHtml;
    lightboxImages = shots.slice();

    // делегированная обработка кликов по миниатюрам
    const galleryEl = wrap.querySelector('.game-gallery');
    if (galleryEl) {
        galleryEl.addEventListener('click', (e) => {
            const img = e.target.closest('img.gallery-thumb');
            if (!img) return;
            const idx = Number(img.dataset.index);
            openLightbox(idx);
        });
    }
}
function openLightbox(i) { lightboxIndex = i; updateLightbox(); document.getElementById('lightbox').classList.add('open'); }
function closeLightbox() { document.getElementById('lightbox').classList.remove('open'); }
function lightboxNav(d) { if (!lightboxImages.length) return; lightboxIndex = (lightboxIndex + d + lightboxImages.length) % lightboxImages.length; updateLightbox(); }
function updateLightbox() {
    const imgEl = document.getElementById('lbImg');
    if (!lightboxImages.length) { imgEl.src = ''; document.getElementById('lbCounter').textContent = '' ; return; }
    imgEl.src = lightboxImages[lightboxIndex];
    document.getElementById('lbCounter').textContent = (lightboxIndex + 1) + ' / ' + lightboxImages.length;
}
function handleLightboxKeys(e) {
    if (!document.getElementById('lightbox').classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') lightboxNav(-1);
    if (e.key === 'ArrowRight') lightboxNav(1);
}

/* =====================================================================
   ЦЕНА — прозрачно: база + фиксированная наценка 500 ₽
   ===================================================================== */

function renderPriceCard(g) {
    const el = document.getElementById('priceCard');
    if (!g) { el.innerHTML = ''; return; }

    // ensure numeric fields
    const priceRub = typeof g.price_rub === 'number' ? g.price_rub : (g.price_rub ? Number(g.price_rub) : null);

    if (g.is_free && g.source === 'steam') {
        el.innerHTML = `
            <div class="g-price free">Бесплатно</div>
            <button class="g-buy-btn" id="buyBtn">🛒 Получить в Steam</button>
            <div class="g-buy-note">Откроется страница игры в Steam — установка бесплатна</div>`;
        document.getElementById('buyBtn').addEventListener('click', () => {
            if (/^\d+$/.test(String(g.id))) window.open(`https://store.steampowered.com/app/${g.id}/`, '_blank', 'noopener');
            else window.open('https://store.steampowered.com/search/?term=' + encodeURIComponent(g.title), '_blank', 'noopener');
        });
        return;
    }
    if (g.is_free) {
        el.innerHTML = `
            <div class="g-price free">Бесплатно</div>
            <button class="g-buy-btn" id="buyBtn">🛒 Получить</button>
            <div class="g-buy-note">Оформление через менеджера ВКонтакте или Telegram</div>`;
        document.getElementById('buyBtn').addEventListener('click', buyGame);
        return;
    }
    const discountRow = (g.discount_percent > 0 && g.original_price_rub) ? `
        <div class="g-price-old-row"><span class="g-price-old">${formatRub(g.original_price_rub)}</span><span class="g-discount-badge">−${g.discount_percent}%</span></div>` : '';
    const breakdown = (typeof g.base_price_rub === 'number' && typeof g.markup_rub === 'number')
        ? `Цена в Steam: ${formatRub(g.base_price_rub)} + сервисный сбор ${formatRub(g.markup_rub)} = ${formatRub(g.price_rub)}` : '';
    el.innerHTML = `
        ${discountRow}
        <div class="g-price">${priceRub !== null ? formatRub(priceRub) : '—'}</div>
        <div class="g-price-breakdown">${escapeHtml(breakdown)}</div>
        <button class="g-buy-btn" id="buyBtn">🛒 Купить игру</button>
        <div class="g-buy-note">Оплата происходит через менеджера ВКонтакте или Telegram</div>`;
    document.getElementById('buyBtn').addEventListener('click', buyGame);
}

function buyGame() {
    if (!currentGame) return;
    const priceLabel = currentGame.is_free ? 'бесплатно' : (currentGame.price_rub ? formatRub(currentGame.price_rub) : 'по запросу');
    const platformsLabel = (currentGame.platforms || []).map(p => PLATFORM_LABELS[p] || p).join('/');
    const text = `Здравствуйте! Хочу купить игру ${currentGame.title} на платформу ${platformsLabel} (${priceLabel}).`;
    completePurchaseFlow(text);
}

/* =====================================================================
   ДОПОЛНЕНИЯ / ВНУТРИИГРОВАЯ ВАЛЮТА (только для этой игры)
   ===================================================================== */

function renderUpsells(g) {
    const el = document.getElementById('upsellsSection');
    const items = g.upsells || [];
    if (items.length === 0) { el.innerHTML = ''; return; }

    el.innerHTML = `
        <div class="g-section">
            <div class="g-section-ttl">💎 Дополнения и внутриигровая валюта</div>
            <div class="g-section-sub">Дополнительный контент для этой игры</div>
            <div class="ig-grid">
                ${items.map(it => `
                    <div class="ig-item">
                        ${it.cover ? `<img src="${escapeHtml(it.cover)}" alt="${escapeHtml(it.name)}">` : ''}
                        <div class="ig-info"><div class="ig-nm">${escapeHtml(it.name)}</div><div class="ig-pr">${formatRub(it.price_rub)}</div></div>
                        <button class="ig-buy" data-name="${escapeHtml(it.name)}" data-price="${Number(it.price_rub) || 0}">+</button>
                    </div>
                `).join('')}
            </div>
        </div>`;

    // делегирование: обработчик для кнопок покупки дополнений
    const grid = el.querySelector('.ig-grid');
    if (grid) {
        grid.addEventListener('click', (e) => {
            const btn = e.target.closest('button.ig-buy');
            if (!btn) return;
            const name = btn.dataset.name || '';
            const price = Number(btn.dataset.price) || 0;
            buyUpsell(name, price);
        });
    }
}

function buyUpsell(name, price) {
    if (!currentGame) return;
    const text = `Здравствуйте! Хочу купить «${name}» для игры ${currentGame.title} за ${price.toLocaleString('ru-RU')} ₽.`;
    completePurchaseFlow(text);
}
