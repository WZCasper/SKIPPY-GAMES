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
    return raw ? (isNaN(Number(raw)) ? raw : Number(raw)) : null;
}

function loadGame() {
    const id = getGameIdFromUrl();
    if (!id) { renderNotFound(); return; }
    fetch(GAME_DETAIL_URL(id), { cache: 'no-store' })
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(g => { currentGame = g; renderGame(g); })
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
        hero.innerHTML = `<video controls preload="metadata" poster="${g.hero || g.cover}"><source src="${g.trailer_video}" type="video/mp4"></video>`;
        return;
    }
    if (g.trailer_youtube_id) {
        hero.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(g.trailer_youtube_id)}?rel=0" title="Трейлер ${escapeHtml(g.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
        return;
    }
    const searchUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(g.title + ' trailer');
    hero.innerHTML = `
        <img src="${g.hero || g.cover}" alt="${escapeHtml(g.title)}" style="opacity:.55">
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
    if (shots.length === 0) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = `<div class="game-gallery">${shots.map((src, i) => `<img src="${src}" alt="Скриншот ${i + 1}" loading="lazy" onclick="openLightbox(${i})">`).join('')}</div>`;
    lightboxImages = shots;
}
function openLightbox(i) { lightboxIndex = i; updateLightbox(); document.getElementById('lightbox').classList.add('open'); }
function closeLightbox() { document.getElementById('lightbox').classList.remove('open'); }
function lightboxNav(d) { if (!lightboxImages.length) return; lightboxIndex = (lightboxIndex + d + lightboxImages.length) % lightboxImages.length; updateLightbox(); }
function updateLightbox() {
    document.getElementById('lbImg').src = lightboxImages[lightboxIndex];
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
    if (g.is_free) {
        el.innerHTML = `
            <div class="g-price free">Бесплатно</div>
            <button class="g-buy-btn" id="buyBtn">🛒 Получить в Steam</button>
            <div class="g-buy-note">Откроется страница игры в Steam — установка бесплатна</div>`;
        document.getElementById('buyBtn').addEventListener('click', () => {
            window.open(`https://store.steampowered.com/app/${g.id}/`, '_blank', 'noopener');
        });
        return;
    }
    const discountRow = (g.discount_percent > 0 && g.original_price_rub) ? `
        <div class="g-price-old-row"><span class="g-price-old">${formatRub(g.original_price_rub)}</span><span class="g-discount-badge">−${g.discount_percent}%</span></div>` : '';
    const breakdown = (typeof g.base_price_rub === 'number' && typeof g.markup_rub === 'number')
        ? `Цена в Steam: ${formatRub(g.base_price_rub)} + сервисный сбор ${formatRub(g.markup_rub)} = ${formatRub(g.price_rub)}` : '';
    el.innerHTML = `
        ${discountRow}
        <div class="g-price">${formatRub(g.price_rub)}</div>
        <div class="g-price-breakdown">${breakdown}</div>
        <button class="g-buy-btn" id="buyBtn">🛒 Купить игру</button>
        <div class="g-buy-note">Оплата происходит через менеджера ВКонтакте или Telegram</div>`;
    document.getElementById('buyBtn').addEventListener('click', buyGame);
}

function buyGame() {
    if (!currentGame) return;
    const priceLabel = currentGame.is_free ? 'бесплатно' : formatRub(currentGame.price_rub);
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
                        ${it.cover ? `<img src="${it.cover}" alt="${escapeHtml(it.name)}">` : ''}
                        <div class="ig-info"><div class="ig-nm">${escapeHtml(it.name)}</div><div class="ig-pr">${formatRub(it.price_rub)}</div></div>
                        <button class="ig-buy" onclick='buyUpsell(${JSON.stringify(it.name)}, ${it.price_rub})'>+</button>
                    </div>
                `).join('')}
            </div>
        </div>`;
}

function buyUpsell(name, price) {
    if (!currentGame) return;
    const text = `Здравствуйте! Хочу купить «${name}» для игры ${currentGame.title} за ${price.toLocaleString('ru-RU')} ₽.`;
    completePurchaseFlow(text);
}
