'use strict';

var allGames = [];
var filteredGames = [];
var activeGenre = '';
var activePlatform = '';
var searchQuery = '';
var sortMode = 'default';
var maxPrice = 10000;
var freeOnly = false;
var currentPage = 1;
var GAMES_PER_PAGE = 24;
var searchDebounce = null;
var sliderIndex = 0;
var sliderCardWidth = 271; // 255px card + 16px gap

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('footYear').textContent = new Date().getFullYear();
    renderPlatformTabs();
    renderGenreList();
    showSkeletons();
    wireControls();
    initScrollSpy(['hotSlider', 'store', 'about']);
    loadIndex();
});

/* =====================================================================
   ЗАГРУЗКА ДАННЫХ
   ===================================================================== */

function loadIndex() {
    fetch(GAMES_INDEX_URL, { cache: 'no-store' })
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(payload => {
            allGames = Array.isArray(payload.games) ? payload.games : [];
            filteredGames = allGames.slice();
            document.getElementById('statGames').textContent = allGames.length.toLocaleString('ru-RU');
            const plats = new Set();
            allGames.forEach(g => (g.platforms || []).forEach(p => plats.add(p)));
            document.getElementById('statPlatforms').textContent = Math.max(plats.size, 1);
            renderHotSlider();
            applyFilters();
        })
        .catch(err => {
            console.error('Не удалось загрузить data/index.json:', err);
            document.getElementById('gamesGrid').innerHTML = '<div class="no-results">Не удалось загрузить каталог. Попробуйте обновить страницу позже.</div>';
        });
}

function showSkeletons() {
    const grid = document.getElementById('gamesGrid');
    let html = '';
    for (let i = 0; i < 8; i++) {
        html += '<div class="shimmer-card"><div class="shimmer-img"></div><div class="shimmer-body"><div class="shimmer-line w40"></div><div class="shimmer-line w70"></div><div class="shimmer-line w55"></div></div></div>';
    }
    grid.innerHTML = html;
}

/* =====================================================================
   ХИТЫ (реальные скидки Steam, discount_percent > 0)
   ===================================================================== */

function renderHotSlider() {
    const section = document.getElementById('hotSlider');
    const deals = allGames.filter(g => g.discount_percent > 0).sort((a, b) => b.discount_percent - a.discount_percent).slice(0, 12);
    if (deals.length === 0) { section.style.display = 'none'; return; }
    section.style.display = 'block';

    const track = document.getElementById('sliderTrack');
    track.innerHTML = deals.map(g => `
        <a href="game.html?id=${g.id}" class="slider-card">
            <div class="slider-img">
                <img src="${g.cover}" alt="${escapeHtml(g.title)}" loading="lazy">
                <div class="slider-discount">−${g.discount_percent}%</div>
            </div>
            <div class="slider-info">
                <div class="slider-title">${escapeHtml(g.title)}</div>
                <div class="slider-price-row">
                    <span class="slider-price-old">${formatRub(g.original_price_rub)}</span>
                    <span class="slider-price">${formatRub(g.price_rub)}</span>
                </div>
            </div>
        </a>
    `).join('');

    const dotsWrap = document.getElementById('sliderDots');
    const maxIndex = Math.max(0, deals.length - Math.floor(track.parentElement.clientWidth / sliderCardWidth || 3));
    const dotCount = Math.min(deals.length, 8);
    dotsWrap.innerHTML = Array.from({ length: dotCount }).map((_, i) => `<div class="slider-dot${i === 0 ? ' active' : ''}" data-i="${i}"></div>`).join('');
    sliderIndex = 0;

    document.getElementById('slPrev').onclick = () => slideBy(-1, deals.length);
    document.getElementById('slNext').onclick = () => slideBy(1, deals.length);
    dotsWrap.querySelectorAll('.slider-dot').forEach(d => d.addEventListener('click', () => { sliderIndex = Number(d.dataset.i); updateSlider(); }));
}

function slideBy(dir, total) {
    sliderIndex = Math.max(0, Math.min(total - 1, sliderIndex + dir));
    updateSlider();
}
function updateSlider() {
    const track = document.getElementById('sliderTrack');
    track.style.transform = `translateX(-${sliderIndex * sliderCardWidth}px)`;
    document.querySelectorAll('.slider-dot').forEach((d, i) => d.classList.toggle('active', i === sliderIndex));
}

/* =====================================================================
   ФИЛЬТРЫ
   ===================================================================== */

function renderPlatformTabs() {
    const wrap = document.getElementById('ptabs');
    const items = [{ key: '', label: 'Все платформы', icon: '🎮' }]
        .concat(Object.keys(PLATFORM_SHORT).map(k => ({ key: k, label: PLATFORM_SHORT[k], icon: PLATFORM_ICON_SVG[k] })));
    wrap.innerHTML = items.map(it => `
        <button class="ptab${it.key === '' ? ' active' : ''}" data-p="${it.key}">${it.icon.startsWith('<svg') ? it.icon : it.icon + ' '}${escapeHtml(it.label)}</button>
    `).join('');
    wrap.querySelectorAll('.ptab').forEach(btn => {
        btn.addEventListener('click', () => {
            wrap.querySelectorAll('.ptab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activePlatform = btn.dataset.p;
            currentPage = 1;
            applyFilters();
        });
    });
}

function renderGenreList() {
    const wrap = document.getElementById('genreList');
    let html = `<button class="genre-btn active" data-g="">🎮 <span class="gt">Все жанры</span></button>`;
    html += ALL_GENRES.map(g => `<button class="genre-btn" data-g="${escapeHtml(g)}"><span class="gi">${GENRE_ICONS[g] || '🎮'}</span><span class="gt">${escapeHtml(g)}</span></button>`).join('');
    wrap.innerHTML = html;
    wrap.querySelectorAll('.genre-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            wrap.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeGenre = btn.dataset.g;
            currentPage = 1;
            applyFilters();
        });
    });
}

function wireControls() {
    document.getElementById('searchInput').addEventListener('input', e => {
        clearTimeout(searchDebounce);
        const v = e.target.value;
        searchDebounce = setTimeout(() => { searchQuery = v.toLowerCase().trim(); currentPage = 1; applyFilters(); }, 200);
    });

    const priceRange = document.getElementById('priceRange');
    const priceValShow = document.getElementById('priceValShow');
    priceRange.addEventListener('input', () => {
        maxPrice = Number(priceRange.value);
        priceValShow.textContent = maxPrice >= 10000 ? 'Любая' : formatRub(maxPrice);
    });
    priceRange.addEventListener('change', () => { currentPage = 1; applyFilters(); });

    document.getElementById('freeOnly').addEventListener('change', e => { freeOnly = e.target.checked; currentPage = 1; applyFilters(); });
    document.getElementById('sortSel').addEventListener('change', e => { sortMode = e.target.value; renderGames(); });

    document.getElementById('navWishBtn').addEventListener('click', openWishModal);
    document.getElementById('wishClose').addEventListener('click', closeWishModal);
    document.getElementById('wishOverlay').addEventListener('click', e => { if (e.target.id === 'wishOverlay') closeWishModal(); });
}

function applyFilters() {
    filteredGames = allGames.filter(g => {
        if (searchQuery && !g.title.toLowerCase().includes(searchQuery)) return false;
        if (activePlatform && !(g.platforms || []).includes(activePlatform)) return false;
        if (activeGenre && !(g.genres || []).includes(activeGenre)) return false;
        if (freeOnly && !g.is_free) return false;
        if (maxPrice < 10000 && !g.is_free && g.price_rub > maxPrice) return false;
        return true;
    });
    renderGames();
}

function sortedList() {
    const arr = filteredGames.slice();
    if (sortMode === 'price-asc') arr.sort((a, b) => a.price_rub - b.price_rub);
    else if (sortMode === 'price-desc') arr.sort((a, b) => b.price_rub - a.price_rub);
    else if (sortMode === 'name') arr.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
    return arr;
}

/* =====================================================================
   РЕНДЕР СЕТКИ + ПАГИНАЦИЯ
   ===================================================================== */

function renderGames() {
    const grid = document.getElementById('gamesGrid');
    const sorted = sortedList();
    document.getElementById('gamesShown').textContent = sorted.length.toLocaleString('ru-RU');
    document.getElementById('gamesTotal').textContent = 'из ' + allGames.length.toLocaleString('ru-RU');

    if (sorted.length === 0) {
        grid.innerHTML = '<div class="no-results">🔍 Игры не найдены. Попробуйте изменить фильтры.</div>';
        document.getElementById('pagination').innerHTML = '';
        return;
    }

    const totalPages = Math.max(1, Math.ceil(sorted.length / GAMES_PER_PAGE));
    currentPage = Math.min(currentPage, totalPages);
    const start = (currentPage - 1) * GAMES_PER_PAGE;
    const page = sorted.slice(start, start + GAMES_PER_PAGE);

    grid.innerHTML = page.map(gameCardHtml).join('');
    attachCardTilt();
    grid.querySelectorAll('.card-wish').forEach(btn => {
        btn.addEventListener('click', e => {
            e.preventDefault(); e.stopPropagation();
            const id = Number(btn.dataset.id);
            const wished = toggleWishlist(id);
            btn.classList.toggle('wished', wished);
        });
    });

    renderPagination(totalPages);
}

function gameCardHtml(g) {
    const platBadge = g.platforms && g.platforms[0] ? platformShortBadge(g.platforms[0]) : '';
    const priceLabel = g.is_free ? 'Бесплатно' : formatRub(g.price_rub);
    const oldPrice = (!g.is_free && g.discount_percent > 0 && g.original_price_rub) ? `<span class="card-price-old">${formatRub(g.original_price_rub)}</span>` : '';
    const wished = isInWishlist(g.id);
    return `
        <a href="game.html?id=${g.id}" class="game-card">
            <div class="card-img">
                <img src="${g.cover}" alt="${escapeHtml(g.title)}" loading="lazy">
                ${g.discount_percent > 0 ? `<div class="hot-badge">−${g.discount_percent}%</div>` : ''}
                ${platBadge}
                <button class="card-wish${wished ? ' wished' : ''}" data-id="${g.id}">♥</button>
            </div>
            <div class="card-body">
                <div class="card-genre">${escapeHtml((g.genres || [])[0] || '')}</div>
                <div class="card-title">${escapeHtml(g.title)}</div>
                <div class="card-footer">
                    <div><span class="card-price${g.is_free ? ' free' : ''}">${oldPrice}${priceLabel}</span></div>
                    <span class="card-buy">Открыть</span>
                </div>
            </div>
        </a>
    `;
}

function attachCardTilt() {
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('mousemove', e => {
            const r = card.getBoundingClientRect();
            const rx = ((e.clientY - r.top - r.height / 2) / (r.height / 2)) * -6;
            const ry = ((e.clientX - r.left - r.width / 2) / (r.width / 2)) * 6;
            card.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg)`;
        });
        card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
}

function renderPagination(totalPages) {
    const el = document.getElementById('pagination');
    el.innerHTML = '';
    if (totalPages <= 1) return;
    const mk = (label, page, active, disabled) => {
        const b = document.createElement('button');
        b.className = 'page-btn' + (active ? ' active' : '');
        b.textContent = label;
        b.disabled = !!disabled;
        b.addEventListener('click', () => { currentPage = page; renderGames(); document.getElementById('store').scrollIntoView({ behavior: 'smooth' }); });
        return b;
    };
    el.appendChild(mk('«', Math.max(1, currentPage - 1), false, currentPage === 1));
    const w = 2;
    for (let p = 1; p <= totalPages; p++) {
        if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= w) el.appendChild(mk(String(p), p, p === currentPage, false));
        else if (Math.abs(p - currentPage) === w + 1) { const d = document.createElement('span'); d.className = 'page-dots'; d.textContent = '…'; el.appendChild(d); }
    }
    el.appendChild(mk('»', Math.min(totalPages, currentPage + 1), false, currentPage === totalPages));
}

/* =====================================================================
   WISHLIST MODAL
   ===================================================================== */

function openWishModal() {
    renderWishModal();
    document.getElementById('wishOverlay').classList.add('open');
}
function closeWishModal() { document.getElementById('wishOverlay').classList.remove('open'); }
function renderWishModal() {
    const ids = getWishlist();
    const items = allGames.filter(g => ids.includes(g.id));
    const el = document.getElementById('wishList');
    if (items.length === 0) { el.innerHTML = '<div class="wish-empty">Список желаний пуст.<br>Добавляйте игры значком ♥ на карточках.</div>'; return; }
    el.innerHTML = items.map(g => `
        <a href="game.html?id=${g.id}" class="wish-item">
            <div class="wish-img"><img src="${g.cover}" alt="${escapeHtml(g.title)}"></div>
            <div class="wish-info"><div class="wish-title">${escapeHtml(g.title)}</div><div class="wish-price">${g.is_free ? 'Бесплатно' : formatRub(g.price_rub)}</div></div>
            <button class="wish-del" data-id="${g.id}">✕</button>
        </a>
    `).join('');
    el.querySelectorAll('.wish-del').forEach(btn => {
        btn.addEventListener('click', e => {
            e.preventDefault(); e.stopPropagation();
            toggleWishlist(Number(btn.dataset.id));
            renderWishModal();
            renderGames();
        });
    });
}
