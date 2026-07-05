'use strict';

/* =====================================================================
   СОСТОЯНИЕ КАТАЛОГА
   ===================================================================== */

var allGames = [];
var filteredGames = [];
var currencyItems = [];
var activeFilters = { platform: '', genres: [], priceMax: '', freeOnly: false };
var searchQuery = '';
var sortMode = 'default';
var currentPage = 1;
var GAMES_PER_PAGE = 24;
var searchDebounceTimer = null;
var activeCurrencyCategory = '';

var allGenres = [
    'Экшен', 'Шутеры от первого лица (FPS)', 'Шутеры от третьего лица (TPS)',
    'Тактические шутеры', 'Геройские шутеры', 'Файтинги', 'Слэшеры',
    "Beat 'em up", 'Платформеры', 'Королевская битва (Battle Royale)',
    'Классические ролевые игры (CRPG)', 'Экшен-РПГ (Action-RPG)',
    'Японские ролевые игры (JRPG)', 'MMORPG', 'Стратегии в реальном времени (RTS)',
    'Пошаговые стратегии (TBS)', 'Глобальные стратегии (4X)', 'MOBA',
    'Башенная защита (Tower Defense)', 'Автобатлеры', 'Приключения',
    'Квесты (Point-and-Click)', 'Интерактивное кино', 'Визуальные новеллы',
    'Головоломки', 'Градостроительные симуляторы', 'Экономические симуляторы',
    'Симуляторы жизни', 'Технические симуляторы', 'Иммерсивные симуляторы (Immersive Sim)',
    'Спортивные симуляторы', 'Гоночные симуляторы (Simracing)', 'Аркадные гонки',
    'Выживание (Survival)', 'Хорроры на выживание (Survival Horror)',
    'Психологические хорроры', 'Экшен-адвенчуры', 'Песочницы (Sandbox)',
    'Рогалики (Roguelike/Roguelite)', 'Метроидвании', 'Стелс-экшен',
    'Ритм-игры', 'Казуальные игры'
];

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('footer-year').textContent = new Date().getFullYear();
    renderGenreCheckboxes();
    setupFilterEvents();
    loadIndex();
    loadCurrency();
    window.addEventListener('scroll', handleScrollUi);
    document.addEventListener('click', handleOutsideClickForDropdown);
});

/* =====================================================================
   ЗАГРУЗКА ДАННЫХ
   ===================================================================== */

function loadIndex() {
    fetch(GAMES_INDEX_URL, { cache: 'no-store' })
        .then(resp => { if (!resp.ok) throw new Error('HTTP ' + resp.status); return resp.json(); })
        .then(payload => {
            allGames = Array.isArray(payload.games) ? payload.games : [];
            filteredGames = allGames.slice();
            document.getElementById('stat-games').textContent = allGames.length.toLocaleString('ru-RU');
            const platformsSeen = new Set();
            allGames.forEach(g => (g.platforms || []).forEach(p => platformsSeen.add(p)));
            document.getElementById('stat-platforms').textContent = Math.max(platformsSeen.size, 1);
            applyFilters();
            renderHotDeals();
        })
        .catch(err => {
            console.error('Не удалось загрузить data/index.json:', err);
            document.getElementById('gamesGrid').innerHTML =
                '<div class="col-span-full text-center py-20 text-neutral-500"><i class="fa-solid fa-triangle-exclamation text-4xl mb-3"></i><p>Не удалось загрузить каталог. Попробуйте обновить страницу позже.</p></div>';
        });
}

function loadCurrency() {
    fetch(CURRENCY_URL, { cache: 'no-store' })
        .then(resp => { if (!resp.ok) throw new Error('HTTP ' + resp.status); return resp.json(); })
        .then(payload => {
            currencyItems = Array.isArray(payload.items) ? payload.items : [];
            document.getElementById('stat-currency').textContent = currencyItems.length.toLocaleString('ru-RU');
            renderCurrency();
        })
        .catch(err => {
            console.error('Не удалось загрузить data/currency.json:', err);
            document.getElementById('currencyGrid').innerHTML = '';
            document.getElementById('currencyEmpty').classList.remove('hidden');
        });
}

/* =====================================================================
   ГОРЯЩИЕ ПРЕДЛОЖЕНИЯ (реальные скидки Steam, discount_percent > 0)
   ===================================================================== */

function renderHotDeals() {
    const section = document.getElementById('hotdeals-section');
    const deals = allGames.filter(g => g.discount_percent > 0).sort((a, b) => b.discount_percent - a.discount_percent).slice(0, 10);
    if (deals.length === 0) {
        section.style.display = 'none';
        return;
    }
    section.style.display = 'block';
    section.innerHTML = `
        <h3 class="text-2xl font-extrabold text-white mb-4">🔥 Горящие предложения</h3>
        <div class="flex gap-4 overflow-x-auto hot-deals-scroll pb-3">
            ${deals.map(g => `
                <a href="game.html?id=${g.id}" class="hot-deal-card shrink-0 w-64 bg-neutral-800 rounded-2xl overflow-hidden border border-neutral-700 hover:border-yellow-500 transition-colors block">
                    <div class="relative h-36">
                        <img src="${g.cover}" alt="${escapeHtml(g.title)}" loading="lazy" class="w-full h-full object-cover">
                        <div class="cover-shade"></div>
                        <div class="absolute top-2 right-2 bg-red-600 text-white text-xs font-extrabold px-2 py-1 rounded-lg">−${g.discount_percent}%</div>
                    </div>
                    <div class="p-4">
                        <p class="font-bold text-white text-sm mb-2 line-clamp-1">${escapeHtml(g.title)}</p>
                        <div class="flex items-baseline gap-2">
                            <span class="text-neutral-500 text-xs line-through">${formatRub(g.original_price_rub)}</span>
                            <span class="text-yellow-500 font-extrabold">${formatRub(g.price_rub)}</span>
                        </div>
                    </div>
                </a>
            `).join('')}
        </div>
    `;
}

/* =====================================================================
   ФИЛЬТРЫ / ПОИСК / СОРТИРОВКА / ПАГИНАЦИЯ
   ===================================================================== */

function renderGenreCheckboxes() {
    const wrap = document.getElementById('genre-dropdown');
    wrap.innerHTML = allGenres.map(g => `
        <label class="flex items-center gap-2 text-neutral-300 hover:text-white cursor-pointer text-sm py-1 select-none">
            <input type="checkbox" value="${escapeHtml(g)}" class="genre-checkbox accent-yellow-500 w-4 h-4" onchange="onGenreChange()">
            ${escapeHtml(g)}
        </label>
    `).join('');
}

function toggleGenreDropdown() {
    document.getElementById('genre-dropdown').classList.toggle('hidden-dd');
}

function handleOutsideClickForDropdown(e) {
    const dd = document.getElementById('genre-dropdown');
    const btn = document.getElementById('genre-dd-btn');
    if (!dd.contains(e.target) && !btn.contains(e.target)) {
        dd.classList.add('hidden-dd');
    }
}

function onGenreChange() {
    activeFilters.genres = Array.from(document.querySelectorAll('.genre-checkbox:checked')).map(el => el.value);
    const badge = document.getElementById('genre-count-badge');
    if (activeFilters.genres.length > 0) {
        badge.textContent = String(activeFilters.genres.length);
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
    currentPage = 1;
    applyFilters();
}

function setupFilterEvents() {
    document.getElementById('searchInput').addEventListener('input', (e) => {
        clearTimeout(searchDebounceTimer);
        const value = e.target.value;
        searchDebounceTimer = setTimeout(() => {
            searchQuery = value.toLowerCase().trim();
            currentPage = 1;
            applyFilters();
        }, 200);
    });

    document.querySelectorAll('.platform-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.platform-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilters.platform = btn.dataset.platform;
            currentPage = 1;
            applyFilters();
        });
    });

    document.getElementById('priceMaxSelect').addEventListener('change', (e) => {
        activeFilters.priceMax = e.target.value;
        currentPage = 1;
        applyFilters();
    });

    document.getElementById('freeOnlyCheckbox').addEventListener('change', (e) => {
        activeFilters.freeOnly = e.target.checked;
        currentPage = 1;
        applyFilters();
    });

    document.getElementById('sortSelect').addEventListener('change', (e) => {
        sortMode = e.target.value;
        renderGames();
    });

    document.querySelectorAll('.currency-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.currency-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeCurrencyCategory = btn.dataset.category;
            renderCurrency();
        });
    });
}

function applyFilters() {
    filteredGames = allGames.filter(game => {
        if (searchQuery && !game.title.toLowerCase().includes(searchQuery)) return false;
        if (activeFilters.platform && !(game.platforms || []).includes(activeFilters.platform)) return false;
        if (activeFilters.genres.length > 0 && !activeFilters.genres.some(g => (game.genres || []).includes(g))) return false;
        if (activeFilters.freeOnly && !game.is_free) return false;
        if (activeFilters.priceMax && !game.is_free && game.price_rub > Number(activeFilters.priceMax)) return false;
        return true;
    });
    renderGames();
}

function sortGames(list) {
    const arr = list.slice();
    if (sortMode === 'price_asc') arr.sort((a, b) => a.price_rub - b.price_rub);
    else if (sortMode === 'price_desc') arr.sort((a, b) => b.price_rub - a.price_rub);
    else if (sortMode === 'az') arr.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
    return arr;
}

function renderGames() {
    const grid = document.getElementById('gamesGrid');
    const noRes = document.getElementById('noResults');
    const paginationEl = document.getElementById('pagination');
    const sorted = sortGames(filteredGames);

    document.getElementById('resultsCount').textContent = `Показано: ${sorted.length.toLocaleString('ru-RU')} игр`;

    if (sorted.length === 0) {
        grid.innerHTML = '';
        grid.classList.add('hidden');
        noRes.classList.remove('hidden');
        paginationEl.innerHTML = '';
        return;
    }
    grid.classList.remove('hidden');
    noRes.classList.add('hidden');

    const totalPages = Math.max(1, Math.ceil(sorted.length / GAMES_PER_PAGE));
    currentPage = Math.min(currentPage, totalPages);
    const start = (currentPage - 1) * GAMES_PER_PAGE;
    const pageItems = sorted.slice(start, start + GAMES_PER_PAGE);

    grid.innerHTML = pageItems.map(game => gameCardHtml(game)).join('');
    attachCardTilt();
    renderPagination(totalPages);
}

function gameCardHtml(game) {
    const platHTML = (game.platforms || []).map(platformIconHtml).join('');
    const priceLabel = game.is_free ? 'Бесплатно' : formatRub(game.price_rub);
    const wished = isInWishlist(game.id);
    return `
        <div class="card-container">
            <a href="game.html?id=${game.id}" class="card-3d bg-neutral-800 rounded-2xl overflow-hidden border border-neutral-700 h-full flex flex-col block">
                <div class="relative h-48 w-full">
                    <img src="${game.cover}" alt="${escapeHtml(game.title)}" loading="lazy" class="w-full h-full object-cover">
                    <div class="cover-shade"></div>
                    <div class="absolute bottom-3 left-4 flex gap-2 text-sm">${platHTML}</div>
                    <div class="absolute top-3 right-3 bg-neutral-900/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-neutral-700 text-xs text-yellow-400 font-bold">${escapeHtml((game.genres || [])[0] || '')}</div>
                    <button onclick="event.preventDefault(); event.stopPropagation(); handleWishlistClick(${game.id}, this)" class="absolute top-3 left-3 w-9 h-9 rounded-full bg-neutral-900/80 backdrop-blur-sm flex items-center justify-center hover:bg-neutral-900 transition-colors">
                        <i class="fa-solid fa-heart ${wished ? 'text-red-500' : 'text-neutral-500'}"></i>
                    </button>
                </div>
                <div class="p-5 flex-grow flex flex-col justify-between">
                    <h3 class="font-bold text-lg text-white mb-1 line-clamp-2">${escapeHtml(game.title)}</h3>
                    <div class="mt-4 flex items-end justify-between">
                        <span class="text-2xl font-extrabold text-white">${priceLabel}</span>
                        <div class="w-10 h-10 rounded-xl bg-yellow-500 flex items-center justify-center text-neutral-900">
                            <i class="fa-solid fa-arrow-right"></i>
                        </div>
                    </div>
                </div>
            </a>
        </div>
    `;
}

function handleWishlistClick(id, btnEl) {
    const nowWished = toggleWishlist(id);
    const icon = btnEl.querySelector('i');
    icon.classList.toggle('text-red-500', nowWished);
    icon.classList.toggle('text-neutral-500', !nowWished);
}

function attachCardTilt() {
    document.querySelectorAll('.card-container').forEach(container => {
        const card = container.querySelector('.card-3d');
        container.addEventListener('mousemove', (e) => {
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left, y = e.clientY - rect.top;
            const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -15;
            const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 15;
            card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });
        container.addEventListener('mouseleave', () => { card.style.transform = 'rotateX(0deg) rotateY(0deg)'; });
    });
}

function renderPagination(totalPages) {
    const el = document.getElementById('pagination');
    el.innerHTML = '';
    if (totalPages <= 1) return;
    const makeBtn = (label, page, isActive, disabled) => {
        const btn = document.createElement('button');
        btn.className = 'pagination-btn px-4 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-300 text-sm font-semibold hover:border-yellow-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed' + (isActive ? ' active' : '');
        btn.textContent = label;
        btn.disabled = !!disabled;
        btn.addEventListener('click', () => { currentPage = page; renderGames(); document.getElementById('store').scrollIntoView({ behavior: 'smooth' }); });
        return btn;
    };
    el.appendChild(makeBtn('«', Math.max(1, currentPage - 1), false, currentPage === 1));
    const windowSize = 2;
    for (let p = 1; p <= totalPages; p++) {
        if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= windowSize) {
            el.appendChild(makeBtn(String(p), p, p === currentPage, false));
        } else if (Math.abs(p - currentPage) === windowSize + 1) {
            const dots = document.createElement('span');
            dots.className = 'text-neutral-600 px-1';
            dots.textContent = '…';
            el.appendChild(dots);
        }
    }
    el.appendChild(makeBtn('»', Math.min(totalPages, currentPage + 1), false, currentPage === totalPages));
}

/* =====================================================================
   "ЗАГРУЗИТЬ ПОЛНЫЙ КАТАЛОГ" — прогрессивный рендер уже загруженных
   данных пачками, с живым счётчиком (весь каталог уже в data/index.json,
   это честная порционная отрисовка в DOM, а не имитация сети).
   ===================================================================== */

var fullCatalogLoaded = false;

function loadFullCatalog() {
    if (fullCatalogLoaded) return;
    fullCatalogLoaded = true;
    document.getElementById('loadFullCatalogBtn').classList.add('hidden');
    document.getElementById('catalogProgressWrap').classList.remove('hidden');

    GAMES_PER_PAGE = 999999;
    const sorted = sortGames(filteredGames);
    const grid = document.getElementById('gamesGrid');
    grid.innerHTML = '';
    document.getElementById('pagination').innerHTML = '';

    const batchSize = 200;
    let rendered = 0;
    const bar = document.getElementById('catalogProgressBar');
    const counter = document.getElementById('catalogProgressCount');

    function renderBatch() {
        const batch = sorted.slice(rendered, rendered + batchSize);
        if (batch.length === 0) {
            bar.style.width = '100%';
            return;
        }
        grid.insertAdjacentHTML('beforeend', batch.map(gameCardHtml).join(''));
        rendered += batch.length;
        counter.textContent = rendered.toLocaleString('ru-RU');
        bar.style.width = Math.round((rendered / sorted.length) * 100) + '%';
        attachCardTilt();
        requestAnimationFrame(() => setTimeout(renderBatch, 30));
    }
    renderBatch();
}

function resetCatalogView() {
    fullCatalogLoaded = false;
    GAMES_PER_PAGE = 24;
    currentPage = 1;
    document.getElementById('loadFullCatalogBtn').classList.remove('hidden');
    document.getElementById('catalogProgressWrap').classList.add('hidden');
    document.getElementById('catalogProgressBar').style.width = '0%';
    document.getElementById('catalogProgressCount').textContent = '0';
    renderGames();
}

/* =====================================================================
   ВНУТРИИГРОВАЯ ВАЛЮТА
   ===================================================================== */

function renderCurrency() {
    const grid = document.getElementById('currencyGrid');
    const empty = document.getElementById('currencyEmpty');
    const items = activeCurrencyCategory
        ? currencyItems.filter(i => i.category === activeCurrencyCategory)
        : currencyItems;

    if (items.length === 0) {
        grid.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');
    grid.innerHTML = items.map(item => `
        <div class="bg-neutral-800 rounded-2xl p-4 border border-neutral-700 flex items-center gap-4">
            ${item.cover ? `<img src="${item.cover}" alt="${escapeHtml(item.name)}" class="w-16 h-16 rounded-lg object-cover shrink-0">` : ''}
            <div class="flex-grow min-w-0">
                <p class="text-sm font-bold text-white truncate">${escapeHtml(item.name)}</p>
                <p class="text-xs text-neutral-500 truncate">${escapeHtml(item.game_title)}</p>
                <p class="text-yellow-500 font-extrabold mt-1">${formatRub(item.price_rub)}</p>
            </div>
            <button onclick='buyCurrencyItem(${JSON.stringify(item.name)}, ${JSON.stringify(item.game_title)}, ${item.price_rub})' class="shrink-0 w-10 h-10 rounded-xl bg-yellow-500 hover:bg-yellow-400 flex items-center justify-center text-neutral-900 transition-colors">
                <i class="fa-solid fa-cart-plus"></i>
            </button>
        </div>
    `).join('');
}

function buyCurrencyItem(name, gameTitle, price) {
    const text = `Здравствуйте! Хочу купить «${name}» (${gameTitle}) за ${price.toLocaleString('ru-RU')} ₽.`;
    completePurchaseFlow(text);
}

/* =====================================================================
   WISHLIST DRAWER
   ===================================================================== */

function openWishlistDrawer() {
    renderWishlistDrawer();
    document.getElementById('wishlist-overlay').classList.remove('closed');
    document.getElementById('wishlist-drawer').classList.remove('closed');
}
function closeWishlistDrawer() {
    document.getElementById('wishlist-overlay').classList.add('closed');
    document.getElementById('wishlist-drawer').classList.add('closed');
}
function renderWishlistDrawer() {
    const ids = getWishlist();
    const container = document.getElementById('wishlist-items');
    const items = allGames.filter(g => ids.includes(g.id));
    if (items.length === 0) {
        container.innerHTML = '<p class="text-neutral-500 text-sm text-center py-10">Список желаний пуст.<br>Добавляйте игры значком ♥ на карточках.</p>';
        return;
    }
    container.innerHTML = items.map(g => `
        <div class="flex items-center gap-3 bg-neutral-800 rounded-xl p-3 border border-neutral-700">
            <img src="${g.cover}" alt="${escapeHtml(g.title)}" class="w-16 h-12 rounded-lg object-cover shrink-0">
            <a href="game.html?id=${g.id}" class="flex-grow min-w-0">
                <p class="text-sm font-bold text-white truncate">${escapeHtml(g.title)}</p>
                <p class="text-yellow-500 text-sm font-extrabold">${g.is_free ? 'Бесплатно' : formatRub(g.price_rub)}</p>
            </a>
            <button onclick="removeFromWishlistDrawer(${g.id})" class="w-8 h-8 rounded-lg bg-neutral-900 hover:bg-red-600 flex items-center justify-center text-neutral-400 hover:text-white transition-colors shrink-0">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
    `).join('');
}
function removeFromWishlistDrawer(id) {
    toggleWishlist(id);
    renderWishlistDrawer();
    renderGames();
}

/* =====================================================================
   SCROLL UI (кнопка "наверх")
   ===================================================================== */

function handleScrollUi() {
    const btt = document.getElementById('back-to-top');
    if (window.scrollY > 400) btt.classList.remove('hidden-btt');
    else btt.classList.add('hidden-btt');
}
