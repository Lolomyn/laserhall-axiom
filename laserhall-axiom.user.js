// ==UserScript==
// @name         Laserhall Axiom
// @namespace    https://laserhall.simprint.pro/
// @version      53.0.2
// @description  
// @match        https://laserhall.simprint.pro/axiom/index_postpress.php
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    /* ===================== CONFIG ===================== */
    const TIME_URL = 'https://work.laserhall.org/';
    const TIME_TOOLTIP = 'Учёт времени';
    const TIME_NEW_TAB = true;
    const ICON_SIZE_PX = 20;

    const TABS_TO_REMOVE = ['Изделия', 'Упаковка', 'Доставка'];
    const NATIVE_TABS = ['Домой', 'Участки'];
    const DIVIDER_COLOR = '#c9ccd1';
    const DIVIDER_HEIGHT = 22;

    const ORDER_INPUT_ID = 'ProductId';
    const ORDER_URL_TPL = 'https://laserhall.simprint.pro/axiom/index_postpress.php#ProductId={v}';

    const PREPRESS_URL = 'https://laserhall.simprint.pro/axiom/index_prepress.php';
    const TXT_SECTIONS = ['1 ШФ', '14 ШФ Постпечать', '14 ШФ'];

    const SHF_PAGE_URL = 'https://laserhall.simprint.pro/axiom/index_postpress.php';
    const SHF_LEFT = { label: '1 / ШФ', title: '1 / ШФ', value: '5' };
    const SHF_RIGHT = { label: '14 / ШФ постпечать', title: '14 / ШФ постпечать', value: '86' };

    const COL_HEADERS_SHF = ['№', 'Название', 'Описание', 'Кол-во', 'Готовность'];
    const PREPRESS_COL_HEADERS = ['№', 'Клиент', 'Название', 'Менеджер'];

    const AUTO_REFRESH_INTERVAL = 60000;
    const ROW_COLORS = { today: '#fff9c4', future: '#e8f5e9', overdue: '#ffebee', unknown: '' };

    const MATERIAL_MAP = {
        'Белая матовая пленке (Китай) -- ШФ': 'Белая матовая Китай',
        'Белая глянцевая пленке (Китай) -- ШФ': 'Белая глянцевая Китай',
        'Прозрачная глянцевая пленке (Китай) -- ШФ': 'Прозрачная глянцевая Китай',
        'Прозрачная матовая пленке (Китай) -- ШФ': 'Прозрачная матовая Китай',
        'Белая матовая пленке (Европа) -- ШФ': 'Белая матовая Европа',
        'Белая глянцевая пленке (Европа) -- ШФ': 'Белая глянцевая Европа',
        'Прозрачная матовая пленке (Европа) -- ШФ': 'Прозрачная матовая Европа',
        'Прозрачная глянцевая пленке (Европа) -- ШФ': 'Прозрачная глянцевая Европа',
        'Постерная бумага 150 гр/м -- ШФ': 'Постерная бумага',
        'Плёнка для роллерных стендов, серый задник (ролапов)-- ШФ': 'Полотно для роллапов',
        'Холст синтетический матовый, 260г/м2 -- ШФ': 'Холст',
        'Баннер 440гр/м -- ШФ': 'Баннер',
        'Солпет, бэклит -- ШФ': 'Солпэт',
        'Белая матовая пленка блокаут -- ШФ': 'Блэкаут',
        'Пленка голографическая (Китай) -- ШФ': 'Голографическая пленка'
    };

    const STOCK_MATERIALS = [
        'Белая матовая Китай',
        'Белая матовая Европа',
        'Белая глянцевая Китай',
        'Белая глянцевая Европа',
        'Прозрачная матовая Китай',
        'Прозрачная матовая Европа',
        'Прозрачная глянцевая Китай',
        'Прозрачная глянцевая Европа',
        'Постерная бумага',
        'Холст',
        'Блокаут',
        'Солпэт',
        'Баннер',
        'Монтажная пленка',
        'ПВХ 3мм',
        'ПВХ 5мм',
        'Оцинковка',
        'Роллерный стенд 850мм',
        'Роллерный стенд 1000мм',
        'Чернила экосольвентные Cyan',
        'Чернила экосольвентные Magenta',
        'Чернила экосольвентные Yellow',
        'Чернила экосольвентные Black',
        'Промывочная жидкость'
    ];

    function normStr(s) {
        return (s || '')
            .replace(/\s+/g, ' ')
            .replace(/--|—|–/g, '-')
            .toLowerCase()
            .trim();
    }
    const MATERIAL_MAP_NORM = {};
    Object.keys(MATERIAL_MAP).forEach(k => { MATERIAL_MAP_NORM[normStr(k)] = MATERIAL_MAP[k]; });

    const PRODUCT_RULES = [
        { pattern: /смолой/i,                                  display: 'Смоляные наклейки / стикерпаки' },
        { pattern: /стикерпак/i,                               display: 'Стикерпаки' },
        { pattern: /роллерн[аы]й\s+стенд/i,                    display: 'Роллерные стенды' },
        { pattern: /картин[аы]/i,                              display: 'Картины' },
        { pattern: /[Тт]абличк[аи]/i,                          display: 'Таблички' },
        { pattern: /наклейк[аи]/i,                             display: 'Наклейки' },
        { pattern: /плакат/i,                                  display: 'Постеры'},
        { pattern: /аппликационная/i,                          display: 'Наклейки на цветной пленке'},
    ];

    /* ===== ЛОГИРОВАНИЕ ===== */
    const LOG_CFG = { enabled: true, debug: false };

    window.tmLog = (enabled = true) => { LOG_CFG.enabled = enabled; console.info('[TM] логирование:', LOG_CFG.enabled ? 'вкл' : 'выкл'); };
    window.tmDebug = (on = true) => { LOG_CFG.enabled = true; LOG_CFG.debug = on; console.info('[TM] debug-режим:', on ? 'вкл' : 'выкл'); };
    window.tmStats = () => ({ день: shfStats, неделя: materialStats });

    const _ts = () => new Date().toTimeString().slice(0, 8);
    function lg(level, module, ...args) {
        if (!LOG_CFG.enabled) return;
        if (level === 'debug' && !LOG_CFG.debug) return;
        (console[level] || console.log)(`[TM ${_ts()}] [${module}]`, ...args);
    }
    const LOG = {
        info:  (m, ...a) => lg('info',  m, ...a),
        debug: (m, ...a) => lg('debug', m, ...a),
        warn:  (m, ...a) => lg('warn',  m, ...a),
        error: (m, ...a) => lg('error', m, ...a),
    };
    function timer(label) {
        const t0 = performance.now();
        return { stop: (module = 'PERF') => { const ms = Math.round(performance.now() - t0); LOG.info(module, `${label}: ${ms} мс`); return ms; } };
    }
    window.addEventListener('error', e => LOG.error('GLOBAL', e.message, `${e.filename}:${e.lineno}`));

    /* ===== СОХРАНЕНИЕ НЕДЕЛЬНОГО ОТЧЁТА В ФАЙЛ ===== */
    function normalizeDayEntry(v) {
        if (!v) return { count: 0, ids: [] };
        if (typeof v === 'number') return { count: v, ids: [] }; // старый формат
        return { count: v.count || 0, ids: Array.isArray(v.ids) ? v.ids : [] };
    }

    function formatDateRu(iso) {
        const [y, m, d] = iso.split('-');
        return `${d}.${m}.${y}`;
    }

    function getWeekEndIso(weekStartIso) {
        const d = new Date(weekStartIso + 'T00:00:00');
        d.setDate(d.getDate() + 6);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function downloadReport(text, filename) {
        try {
            const blob = new Blob(['\ufeff' + text], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 10000);
            LOG.info('REPORT', 'файл сохранён', filename);
        } catch (e) {
            LOG.error('REPORT', 'не удалось сохранить', e);
        }
    }

    function buildReportText(st) {
        const weekEnd = getWeekEndIso(st.weekStart);
        const lines = [];
        lines.push('========================================');
        lines.push('LaserHall — отчёт по участку ШФ');
        lines.push(`Неделя: ${formatDateRu(st.weekStart)} – ${formatDateRu(weekEnd)}`);
        lines.push(`Отчёт сформирован: ${new Date().toLocaleString('ru-RU')}`);
        lines.push('========================================');
        lines.push('');
        lines.push('МАТЕРИАЛЫ:');
        const mats = Object.entries(st.materials || {}).filter(([_, c]) => c > 0).sort((a, b) => b[1] - a[1]);
        if (mats.length) mats.forEach(([name, c]) => lines.push(`  ${name}: ${c}`));
        else lines.push('  (нет данных)');
        lines.push('');
        lines.push('ИЗДЕЛИЯ:');
        const prods = Object.entries(st.products || {}).filter(([_, c]) => c > 0).sort((a, b) => b[1] - a[1]);
        if (prods.length) prods.forEach(([name, c]) => lines.push(`  ${name}: ${c}`));
        else lines.push('  (нет данных)');
        lines.push('');
        lines.push('');
        lines.push('СДЕЛАННЫЕ ЗАКАЗЫ ПО ДНЯМ:');
        const days = Object.entries(st.doneByDay || {}).sort((a, b) => a[0].localeCompare(b[0]));
        let total = 0;
        if (days.length) days.forEach(([d, v]) => {
            const e = normalizeDayEntry(v);
            total += e.count;
            const idsStr = e.ids.length ? ` (${e.ids.join(', ')})` : '';
            lines.push(`  ${formatDateRu(d)} - Сделанные заказы: ${e.count}${idsStr}`);
        });
        else lines.push('  (нет данных)');
        lines.push(`  ИТОГО за неделю: ${total}`);
        lines.push('========================================');
        return lines.join('\n');
    }

    function exportMaterialStatsReport() {
        const hasData = Object.values(materialStats.materials || {}).some(c => c > 0) ||
                        Object.values(materialStats.products || {}).some(c => c > 0) ||
                        Object.keys(materialStats.doneByDay || {}).length > 0;
        if (!hasData) {
            LOG.warn('REPORT', 'нет данных для отчёта');
            return false;
        }
        const filename = `SHF_otchet_${materialStats.weekStart}_${getWeekEndIso(materialStats.weekStart)}.txt`;
        downloadReport(buildReportText(materialStats), filename);
        return true;
    }

    /* ================================================== */

    const CLOCK_SVG = `<svg class="tm-time-icon" width="${ICON_SIZE_PX}" height="${ICON_SIZE_PX}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path><path d="M16.5 16.5l1.6 1.6 3-3" stroke-width="2.2"></path></svg>`;

    /* ===== ОБЩИЕ УТИЛИТЫ ===== */
    const wait = ms => new Promise(r => setTimeout(r, ms));

    function leafByText(t, root = document) {
        const a = root.querySelectorAll('*');
        for (const el of a) if (el.children.length === 0 && el.textContent.trim() === t) return el;
        return null;
    }

    function tabOf(l) {
        let el = l;
        while (el.parentElement && el.parentElement.children.length === 1) el = el.parentElement;
        return el;
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    /* ===== ЧАСТЬ 1. МЕНЮ ===== */
    let built = false;
    let menuContainer = null;

    function divider() {
        const d = document.createElement('span');
        d.className = 'tm-div';
        d.style.cssText = `display:inline-block;width:1px;height:${DIVIDER_HEIGHT}px;background:${DIVIDER_COLOR};align-self:center;margin:0 2px;flex:0 0 auto;`;
        return d;
    }

    function timeIconBlock() {
        const w = document.createElement('span');
        w.className = 'tm-time-tracking';
        w.style.cssText = 'display:inline-flex;align-items:center;align-self:stretch;justify-content:center;';
        const a = document.createElement('a');
        a.href = TIME_URL;
        if (TIME_NEW_TAB) { a.target = '_blank'; a.rel = 'noopener'; }
        a.title = TIME_TOOLTIP;
        a.setAttribute('aria-label', TIME_TOOLTIP);
        a.innerHTML = CLOCK_SVG;
        a.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;padding:0 8px;cursor:pointer;text-decoration:none;color:inherit;line-height:0;';
        a.addEventListener('mouseenter', () => a.style.opacity = '0.65');
        a.addEventListener('mouseleave', () => a.style.opacity = '1');
        w.appendChild(a);
        return w;
    }

    function menuTab(text, onClick, cls, dk) {
        const tab = document.createElement('li');
        tab.innerHTML = `<a href="#">${text}</a>`;
        tab.className = cls || '';
        tab.style.cursor = 'pointer';
        if (dk) tab.dataset[dk] = '1';
        tab.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); onClick(); }, true);
        return tab;
    }

    function orderFieldBlock() {
        const w = document.createElement('span');
        w.className = 'tm-order-field';
        w.style.cssText = 'display:inline-flex;align-items:center;gap:6px;align-self:center;padding:0 8px;';
        const l = document.createElement('span');
        l.textContent = '№';
        l.style.cssText = 'color:#555;font:13px Arial;';
        const i = document.createElement('input');
        i.type = 'text';
        i.className = 'form-control tm-order-input';
        i.placeholder = 'Номер заказа';
        i.setAttribute('accesskey', '0');
        i.style.cssText = 'width:160px;padding:5px 8px;border:1px solid #bbb;border-radius:5px;font:13px Arial;outline:none;';
        i.addEventListener('focus', () => i.style.borderColor = '#1565c0');
        i.addEventListener('blur', () => i.style.borderColor = '#bbb');

        function jump() {
            const v = i.value.trim();
            if (!v) { i.focus(); return; }
            try { if (typeof window.ShowPackForm === 'function') { window.ShowPackForm(v); return; } } catch (e) {}
            try {
                const n = document.getElementById(ORDER_INPUT_ID);
                if (n) {
                    n.value = v;
                    if (typeof window.ShowPackForm === 'function') window.ShowPackForm(v);
                    else n.dispatchEvent(new Event('change', { bubbles: true }));
                    return;
                }
            } catch (e) {}
            window.location.href = ORDER_URL_TPL.replace('{v}', encodeURIComponent(v));
        }

        i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); jump(); } });
        i.addEventListener('change', () => { if (i.value.trim()) jump(); });
        w.appendChild(l);
        w.appendChild(i);
        return w;
    }

    function findMenuContainer() {
        const byId = document.querySelector('ul[id^="menu"]');
        if (byId) return byId;
        const byClass = document.querySelector('ul.nav.navbar-nav');
        if (byClass) return byClass;
        const allMarkers = ['Домой', 'Участки', 'Изделия', 'Упаковка', 'Доставка'];
        for (const t of allMarkers) {
            const lf = leafByText(t);
            if (lf) { const tb = tabOf(lf); if (tb && tb.parentElement) return tb.parentElement; }
        }
        return null;
    }

    function buildMenu() {
        if (built) return;

        let c = menuContainer;
        if (!c || !document.body.contains(c)) c = findMenuContainer();
        if (!c) return;
        menuContainer = c;

        TABS_TO_REMOVE.forEach(t => {
            const lf = leafByText(t);
            if (lf) {
                const tb = tabOf(lf);
                if (tb && tb.parentElement && !tb.classList.contains('tm-shf-tab')) tb.remove();
            }
        });

        c.style.display = 'flex';
        c.style.alignItems = 'center';
        c.style.flexWrap = 'nowrap';

        c.querySelectorAll('.tm-time-tracking,.tm-div,.tm-shf-tab').forEach(n => n.remove());

        const nt = {};
        NATIVE_TABS.forEach(t => { const l = leafByText(t); if (l) nt[t] = tabOf(l); });

        const f = document.createDocumentFragment();
        f.appendChild(timeIconBlock());
        f.appendChild(divider());
        NATIVE_TABS.forEach(t => { if (nt[t]) { f.appendChild(nt[t]); f.appendChild(divider()); } });
        f.appendChild(menuTab('ШФ', toggleUnifiedModal, 'tm-shf-tab', 'tmShf'));

        c.insertBefore(f, c.firstChild);

        const rightUl = document.querySelector('ul.navbar-right, ul.navbar-form.navbar-right');
        if (rightUl && !rightUl.querySelector('.tm-order-field')) {
            const orderField = orderFieldBlock();
            const navbarRight = rightUl.querySelector('#NavbarRight');
            if (navbarRight) rightUl.insertBefore(orderField, navbarRight);
            else rightUl.insertBefore(orderField, rightUl.firstChild);
        }

        requestAnimationFrame(() => {
            const h = c.getBoundingClientRect().height;
            const tt = c.querySelector('.tm-time-tracking');
            if (tt && h > 0) tt.style.height = h + 'px';
        });

        built = true;
        LOG.info('MENU', 'меню собрано');
    }

    function makeFallbackButton() {
        if (document.querySelector('.tm-fallback-time')) return;
        const a = document.createElement('a');
        a.href = TIME_URL;
        if (TIME_NEW_TAB) { a.target = '_blank'; a.rel = 'noopener'; }
        a.className = 'tm-fallback-time';
        a.title = TIME_TOOLTIP;
        a.setAttribute('aria-label', TIME_TOOLTIP);
        a.innerHTML = CLOCK_SVG.replace('class="tm-time-icon"', 'class="tm-time-icon" style="color:#fff;"');
        a.style.cssText = 'position:fixed;top:6px;left:230px;z-index:99999;display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;background:#4CAF50;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.3);text-decoration:none;';
        document.body.appendChild(a);
        LOG.warn('MENU', 'fallback кнопка времени создана');
    }

    document.addEventListener('keydown', e => {
        if (e.altKey && (e.key === '0' || e.code === 'Digit0')) {
            const inp = document.querySelector('.tm-order-input');
            if (inp) { e.preventDefault(); inp.focus(); inp.select(); }
        }
    });

    function setActive(dk, on) {
        const t = document.querySelector(`[data-${dk}="1"]`);
        if (!t) return;
        t.style.outline = on ? '2px solid #ff9800' : '';
        t.style.background = on ? '#ff9800' : '';
        t.style.color = on ? '#fff' : '';
    }

    function setStatus(el, m) { if (el) el.innerHTML = `<div style="padding:24px;font:14px Arial;color:#555;">${m}</div>`; }

    /* ===== ОБЩАЯ БД (GitHub как хранилище) ===== */
    const GH_OWNER = 'Lolomyn';
    const GH_DATA_REPO = 'laserhall-data';   // приватный репозиторий данных
    const STOCK_PATH = 'stock.json';
    const SYNC_DEBOUNCE = 3000;              // пауза после последнего изменения перед отправкой

    const pcName = () => {
        let n = '';
        try { n = localStorage.getItem('tmPcName') || ''; } catch (e) {}
        if (!n) {
            n = 'PC-' + Math.random().toString(36).slice(2, 6).toUpperCase();
            try { localStorage.setItem('tmPcName', n); } catch (e) {}
        }
        return n;
    };

    const ghToken = () => window.tmGithubToken || null;
    const b64e = s => btoa(unescape(encodeURIComponent(s)));
    const b64d = s => decodeURIComponent(escape(atob(s)));

    async function ghRead(path) {
        if (!ghToken()) throw new Error('нет токена');
        const r = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_DATA_REPO}/contents/${path}`, {
            headers: { 'Authorization': `Bearer ${ghToken()}` }
        });
        if (r.status === 404) return null;
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json();
        return { data: JSON.parse(b64d(j.content)), sha: j.sha };
    }

    async function ghWrite(path, obj, sha) {
        if (!ghToken()) throw new Error('нет токена');
        const body = { message: `tm sync ${path} @ ${pcName()}`, content: b64e(JSON.stringify(obj, null, 2)) };
        if (sha) body.sha = sha;
        const r = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_DATA_REPO}/contents/${path}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${ghToken()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json();
        return j.content && j.content.sha;
    }

    /* --- синхронизация склада --- */
    const stockInputs = {};                       // key → input (для живого обновления UI)
    let stockSyncTimer = null;
    let stockSyncState = { ok: null, time: 0, msg: '' };

    const stockJournalGet = () => { try { return JSON.parse(localStorage.getItem('tmStockJournal') || '{}'); } catch (e) { return {}; } };
    const stockJournalSet = j => { try { localStorage.setItem('tmStockJournal', JSON.stringify(j)); } catch (e) {} };

    function updateStockSyncBadge() {
        const badge = document.querySelector('.tm-stock-sync-badge');
        if (!badge) return;
        const t = stockSyncState.time ? new Date(stockSyncState.time).toTimeString().slice(0, 5) : '';
        if (stockSyncState.ok === true)  badge.textContent = `🟢 синхр. ${t} · ${pcName()}`;
        if (stockSyncState.ok === false) badge.textContent = `🔴 локально (${stockSyncState.msg})`;
        if (stockSyncState.ok === null)  badge.textContent = `⏳ синхронизация… · ${pcName()}`;
    }

    function refreshStockInputs() {
        const data = loadStock();
        Object.entries(stockInputs).forEach(([k, inp]) => {
            if (document.activeElement === inp) return;   // не мешаем тому, кто печатает
            inp.value = (data[k] === undefined ? 0 : data[k]);
            paintStockInput(inp, parseFloat(inp.dataset.min) || STOCK_DEFAULT_MIN);
        });
    }

    async function stockSync(reason) {
        if (!ghToken()) {
            stockSyncState = { ok: false, time: Date.now(), msg: 'нет токена' };
            updateStockSyncBadge();
            return;
        }
        stockSyncState = { ok: null, time: stockSyncState.time, msg: '' };
        updateStockSyncBadge();
        try {
            const remote = await ghRead(STOCK_PATH);
            const local = loadStock();
            const journal = stockJournalGet();
            const remoteCells = (remote && remote.data && remote.data.cells) ? remote.data.cells : {};

            const cells = {};
            // 1) база — значения с GitHub
            Object.entries(remoteCells).forEach(([k, rec]) => { cells[k] = rec; });
            // 2) локальные значения, которых нет на GitHub — НЕ теряем, дописываем
            Object.entries(local).forEach(([k, v]) => {
                if (!cells[k] && v) cells[k] = { v: v, t: Date.now(), pc: pcName() };
            });
            // 3) наши свежие правки из журнала — поверх по метке времени
            Object.entries(journal).forEach(([k, rec]) => {
                if (!cells[k] || rec.t > cells[k].t) cells[k] = { v: rec.v, t: rec.t, pc: pcName() };
            });

            // 4) пишем, если файла нет или объединённое состояние отличается от удалённого
            const needWrite = !remote || (JSON.stringify(cells) !== JSON.stringify(remoteCells));

            if (needWrite) {
                const payload = { cells: cells, updated: new Date().toISOString(), pc: pcName() };
                try {
                    await ghWrite(STOCK_PATH, payload, remote ? remote.sha : undefined);
                } catch (we) {
                    // конфликт sha: перечитали, объединили, повторили один раз
                    const remote2 = await ghRead(STOCK_PATH);
                    const rc2 = (remote2 && remote2.data && remote2.data.cells) ? remote2.data.cells : {};
                    Object.entries(cells).forEach(([k, rec]) => {
                        if (!rc2[k] || rec.t > rc2[k].t) rc2[k] = rec;
                    });
                    await ghWrite(STOCK_PATH, { cells: rc2, updated: new Date().toISOString(), pc: pcName() }, remote2 ? remote2.sha : undefined);
                }
            }

            // 5) запись успешна (или не требовалась) — принимаем общее состояние локально
            const newLocal = {};
            Object.entries(cells).forEach(([k, rec]) => { newLocal[k] = rec.v; });
            const changed = JSON.stringify(newLocal) !== JSON.stringify(local);
            saveStock(newLocal);
            stockJournalSet({});
            stockSyncState = { ok: true, time: Date.now(), msg: '' };
            if (changed && stockOpen) refreshStockInputs();
            LOG.info('SYNC', 'склад синхронизирован', { причина: reason, запись: needWrite, изменений: changed });
        } catch (e) {
            // любая ошибка сети/токена: локальные данные НЕ трогаем, журнал сохраняем для доотправки
            stockSyncState = { ok: false, time: Date.now(), msg: (e && e.message) || 'ошибка' };
            LOG.warn('SYNC', 'склад: синхронизация не удалась, работаем локально', e && e.message);
        }
        updateStockSyncBadge();
    }

    function stockScheduleSync() {
        clearTimeout(stockSyncTimer);
        stockSyncTimer = setTimeout(() => stockSync('ввод'), SYNC_DEBOUNCE);
    }

    /* ===== СКЛАД ===== */
    const STOCK_KEY = 'tmStockData';
    const STOCK_DEFAULT_MIN = 2;   // граница по умолчанию: значение < 2 → красный

    const STOCK_GROUPS = [
        {
            title: 'Китай', icon: '🇨🇳',
            items: [
                { k: 'Белая матовая Китай', s: 'Белая матовая' },
                { k: 'Белая глянцевая Китай', s: 'Белая глянцевая' },
                { k: 'Прозрачная матовая Китай', s: 'Прозрачная матовая' },
                { k: 'Прозрачная глянцевая Китай', s: 'Прозрачная глянцевая' },
            ]
        },
        {
            title: 'Европа', icon: '🇪🇺',
            items: [
                { k: 'Белая матовая Европа', s: 'Белая матовая' },
                { k: 'Белая глянцевая Европа', s: 'Белая глянцевая' },
                { k: 'Прозрачная матовая Европа', s: 'Прозрачная матовая' },
                { k: 'Прозрачная глянцевая Европа', s: 'Прозрачная глянцевая' },
            ]
        },
        {
            title: 'Прочие материалы', icon: '🖨️',
            items: ['Постерная бумага', 'Холст', 'Блокаут', 'Солпэт', 'Баннер', 'Монтажная пленка']
        },
        {
            title: 'Роллерные стенды', icon: '📜',
            items: ['Роллерный стенд 850мм', 'Роллерный стенд 1000мм', 'Полотно для роллапов 850мм', 'Полотно для роллапов 1000мм']
        },
        {
            title: 'Чернила экосольвентные', icon: '🎨',
            items: [
                { k: 'Чернила экосольвентные Cyan',    s: 'Cyan',    color: '#00bcd4' },
                { k: 'Чернила экосольвентные Magenta', s: 'Magenta', color: '#e91e63' },
                { k: 'Чернила экосольвентные Yellow',  s: 'Yellow',  color: '#fdd835' },
                { k: 'Чернила экосольвентные Black',   s: 'Black',   color: '#212121' },
                { k: 'Промывочная жидкость',           s: 'Промывочная жидкость', color: '#90a4ae' },
            ]
        },
        {
            title: 'Чернила УФ LUS 210', icon: '🎨',
            items: [
                { k: 'Чернила УФ LUS 210 Cyan',    s: 'Cyan',    color: '#00bcd4' },
                { k: 'Чернила УФ LUS 210 Magenta', s: 'Magenta', color: '#e91e63' },
                { k: 'Чернила УФ LUS 210 Yellow',  s: 'Yellow',  color: '#fdd835' },
                { k: 'Чернила УФ LUS 210 Black',   s: 'Black',   color: '#212121' },
                { k: 'Чернила УФ LUS 210 White',   s: 'White',   color: '#ffffff' },
                { k: 'Промывочная жидкость',       s: 'Промывочная жидкость', color: '#90a4ae' },
            ]
        },
    ];

    let stockEl = null;
    let stockOpen = false;

    function loadStock() {
        try {
            const raw = localStorage.getItem(STOCK_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return {};
    }

    function saveStock(data) {
        try { localStorage.setItem(STOCK_KEY, JSON.stringify(data)); } catch (e) {}
    }

    function paintStockInput(input, min) {
        const v = parseFloat(input.value) || 0;
        if (v < min) {
            input.style.background = '#ffebee';
            input.style.borderColor = '#e53935';
            input.style.color = '#c62828';
            input.style.fontWeight = '700';
        } else {
            input.style.background = '#fff';
            input.style.borderColor = '#bbb';
            input.style.color = '#000';
            input.style.fontWeight = '400';
        }
    }

    function buildStockText() {
        const data = loadStock();
        const lines = [];
        lines.push('========================================');
        lines.push('СКЛАД МАТЕРИАЛОВ — Лазерхолл ШФ');
        lines.push(`Сохранено: ${new Date().toLocaleString('ru-RU')}`);
        lines.push('========================================');
        STOCK_GROUPS.forEach(g => {
            lines.push('');
            lines.push(`${g.title}:`);
            g.items.forEach(it => {
                const key = typeof it === 'string' ? it : it.k;
                const label = typeof it === 'string' ? it : (it.s || it.k);
                const v = data[key];
                lines.push(`  ${label}: ${v === undefined ? 0 : v}`);
            });
        });
        lines.push('');
        lines.push('========================================');
        return lines.join('\n');
    }

    function saveStockToFile() {
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const filename = `Sklad_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}.txt`;
        downloadReport(buildStockText(), filename);
    }

    function saveStockAsXlsx() {
        if (typeof XLSX === 'undefined') {
            LOG.warn('REPORT', 'библиотека XLSX не загружена');
            alert('Библиотека XLSX не загрузилась (нет доступа к CDN). Сохраните в .txt.');
            return;
        }
        const data = loadStock();
        const rows = [['Группа', 'Материал', 'Количество']];
        STOCK_GROUPS.forEach(g => {
            g.items.forEach(it => {
                const key = typeof it === 'string' ? it : it.k;
                const label = typeof it === 'string' ? it : (it.s || it.k);
                rows.push([g.title, label, (data[key] === undefined ? 0 : data[key])]);
            });
        });

        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{ wch: 30 }, { wch: 32 }, { wch: 12 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Склад');

        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const filename = `Sklad_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}.xlsx`;
        XLSX.writeFile(wb, filename);
        LOG.info('REPORT', 'файл склада сохранён', filename);
    }

    function openStockModal() {
        if (!stockEl) {
            const overlay = document.createElement('div');
            overlay.className = 'tm-stock-overlay';
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:100001;display:flex;align-items:center;justify-content:center;';

            const modal = document.createElement('div');
            modal.style.cssText = 'background:#fff;width:70vw;max-width:900px;height:80vh;border-radius:8px;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,.4);overflow:hidden;position:relative;';

            const header = document.createElement('div');
            header.style.cssText = 'padding:12px 16px;background:#f5f5f5;border-bottom:1px solid #ddd;display:flex;align-items:center;justify-content:space-between;font:600 16px Arial;flex-shrink:0;';

            const title = document.createElement('span');
            title.innerHTML = 'Склад материалов &nbsp;<span style="font:12px Arial;color:#c62828;font-weight:400;">🔴 — ниже минимума, пора заказать</span>';

            const syncBadge = document.createElement('span');
            syncBadge.className = 'tm-stock-sync-badge';
            syncBadge.style.cssText = 'font:12px Arial;color:#555;font-weight:400;margin-left:12px;';

            const syncBtn = document.createElement('button');
            syncBtn.textContent = '⟳';
            syncBtn.title = 'Синхронизировать сейчас';
            syncBtn.style.cssText = 'border:1px solid #1565c0;background:#e3f2fd;color:#1565c0;border-radius:4px;padding:2px 8px;cursor:pointer;font:600 14px Arial;';
            syncBtn.addEventListener('click', () => stockSync('кнопка'));
            
            const closeBtn = document.createElement('button');
            closeBtn.textContent = '✕';
            closeBtn.style.cssText = 'border:none;background:#e53935;color:#fff;width:28px;height:28px;border-radius:4px;cursor:pointer;font-size:15px;';
            closeBtn.addEventListener('click', closeStockModal);

            const saveBtn = document.createElement('button');
            saveBtn.textContent = '💾 Сохранить в файл';
            saveBtn.title = 'Скачать текущие значения склада (.txt или .xlsx)';
            saveBtn.style.cssText = 'border:1px solid #2e7d32;background:#e8f5e9;color:#2e7d32;border-radius:4px;padding:4px 10px;cursor:pointer;font:600 13px Arial;';

            const saveMenu = document.createElement('div');
            saveMenu.style.cssText = 'display:none;position:absolute;top:48px;right:14px;background:#fff;border:1px solid #bbb;border-radius:6px;box-shadow:0 6px 18px rgba(0,0,0,.25);padding:6px;z-index:10;min-width:170px;';
            saveMenu.innerHTML = `
                <div data-fmt="txt"  style="padding:6px 12px;cursor:pointer;font:13px Arial;border-radius:4px;">📄 Сохранить в .txt</div>
                <div data-fmt="xlsx" style="padding:6px 12px;cursor:pointer;font:13px Arial;border-radius:4px;">📊 Сохранить в .xlsx</div>
            `;
            saveMenu.querySelectorAll('div[data-fmt]').forEach(d => {
                d.addEventListener('mouseenter', () => d.style.background = '#e3f2fd');
                d.addEventListener('mouseleave', () => d.style.background = 'transparent');
                d.addEventListener('click', () => {
                    saveMenu.style.display = 'none';
                    if (d.dataset.fmt === 'txt') saveStockToFile();
                    else saveStockAsXlsx();
                });
            });

            saveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                saveMenu.style.display = (saveMenu.style.display === 'none') ? 'block' : 'none';
            });
            document.addEventListener('click', (e) => {
                if (saveMenu.style.display !== 'none' && !saveMenu.contains(e.target) && e.target !== saveBtn) {
                    saveMenu.style.display = 'none';
                }
            });

            const hRight = document.createElement('div');
            hRight.style.cssText = 'display:flex;gap:8px;align-items:center;';

            hRight.appendChild(syncBadge);
            hRight.appendChild(syncBtn);
            hRight.appendChild(saveBtn);
            hRight.appendChild(closeBtn);


            header.appendChild(title);
            header.appendChild(hRight);

            const body = document.createElement('div');
            body.style.cssText = 'flex:1;overflow-y:auto;padding:16px;';

            const stockData = loadStock();
            const wrap = document.createElement('div');
            wrap.style.cssText = 'display:flex;flex-direction:column;gap:18px;';

            STOCK_GROUPS.forEach(group => {
                const section = document.createElement('div');

                const gTitle = document.createElement('div');
                gTitle.style.cssText = 'font:600 14px Arial;color:#37474f;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid #90a4ae;display:flex;align-items:center;gap:7px;';
                if (group.icon) {
                    const gi = document.createElement('span');
                    gi.textContent = group.icon;
                    gi.style.cssText = 'font-size:16px;line-height:1;';
                    gTitle.appendChild(gi);
                }
                const gtText = document.createElement('span');
                gtText.textContent = group.title;
                gTitle.appendChild(gtText);

                const grid = document.createElement('div');
                grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;';

                group.items.forEach(it => {
                    const key = typeof it === 'string' ? it : it.k;
                    const label = typeof it === 'string' ? it : (it.s || it.k);
                    const min = (typeof it === 'object' && it.min != null) ? it.min : STOCK_DEFAULT_MIN;

                    const row = document.createElement('div');
                    row.style.cssText = 'display:flex;flex-direction:column;gap:3px;';

                    const lbl = document.createElement('label');
                    lbl.style.cssText = 'font:12px Arial;color:#555;font-weight:500;display:flex;align-items:center;gap:5px;';
                    if (typeof it === 'object' && it.color) {
                        const dot = document.createElement('span');
                        dot.style.cssText = `width:10px;height:10px;border-radius:50%;background:${it.color};border:1px solid rgba(0,0,0,.25);flex:0 0 auto;`;
                        dot.title = label;
                        lbl.appendChild(dot);
                    }
                    if (typeof it === 'object' && it.i) {
                        const ii = document.createElement('span');
                        ii.textContent = it.i;
                        ii.style.cssText = 'font-size:13px;line-height:1;';
                        lbl.appendChild(ii);
                    }
                    const ltText = document.createElement('span');
                    ltText.textContent = label;
                    lbl.appendChild(ltText);

                    const input = document.createElement('input');
                    input.type = 'number';
                    input.value = stockData[key] || 0;
                    input.style.cssText = 'padding:6px 10px;border:1px solid #bbb;border-radius:4px;font:14px Arial;width:100%;';
                    input.title = `Минимум: ${min}`;
                    input.dataset.min = String(min);
                    stockInputs[key] = input;
                    paintStockInput(input, min);
                    input.addEventListener('input', () => {
                        const v = parseFloat(input.value) || 0;
                        const data = loadStock();
                        data[key] = v;
                        saveStock(data);
                        const j = stockJournalGet();
                        j[key] = { v, t: Date.now() };
                        stockJournalSet(j);
                        paintStockInput(input, min);
                        stockScheduleSync();   // отправок на GitHub через 3 сек после последнего ввода
                    });

                    row.appendChild(lbl);
                    row.appendChild(input);
                    grid.appendChild(row);
                });

                section.appendChild(gTitle);
                section.appendChild(grid);
                wrap.appendChild(section);
            });

            body.appendChild(wrap);

            modal.appendChild(header);
            modal.appendChild(body);
            modal.appendChild(saveMenu);
            overlay.appendChild(modal);

            overlay.addEventListener('click', e => { if (e.target === overlay) closeStockModal(); });
            document.body.appendChild(overlay);

            stockEl = overlay;
        } else {
            stockEl.style.display = 'flex';
        }

        stockOpen = true;
        stockSync('открытие модалки');
    }

    function closeStockModal() {
        if (stockEl) stockEl.style.display = 'none';
        stockOpen = false;
    }

    function toggleStockModal() {
        stockOpen ? closeStockModal() : openStockModal();
    }

    /* ===== ЧАСТЬ 2+3. ОБЪЕДИНЁННОЕ ОКНО ===== */
    let unifiedOpen = false, unifiedEl = null, unifiedBusy = false;
    let prepressOpen = false, prepressEl = null, prepressBusy = false;

    let cacheShfLeft = null, cacheShfRight = null, cachePrepress = null;
    let cacheTimestamp = 0;
    const CACHE_TTL = 60000;

    function isCacheFresh() { return Date.now() - cacheTimestamp < CACHE_TTL; }

    function openUnifiedModal() {
        if (!unifiedEl) {
            const o = document.createElement('div');
            o.className = 'tm-modal-overlay';
            o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:100000;display:flex;align-items:center;justify-content:center;';

            const b = document.createElement('div');
            b.style.cssText = 'background:#fff;width:96vw;height:92vh;border-radius:8px;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,.4);overflow:hidden;position:relative;';

            const h = document.createElement('div');
            h.style.cssText = 'padding:10px 14px;background:#f5f5f5;border-bottom:1px solid #ddd;display:flex;align-items:center;justify-content:space-between;font:600 15px Arial;flex-shrink:0;';
            const ti = document.createElement('span');
            ti.textContent = 'Работа участка ШФ';

            const r = document.createElement('div');
            r.style.cssText = 'display:flex;gap:8px;align-items:center;';

            const ppBtn = document.createElement('button');
            ppBtn.textContent = 'Препресс';
            ppBtn.style.cssText = 'border:1px solid #1565c0;background:#e3f2fd;color:#1565c0;border-radius:4px;padding:4px 12px;cursor:pointer;font:600 13px Arial;';
            ppBtn.addEventListener('click', togglePrepressModal);

            // НОВАЯ КНОПКА: Раскладка Oracal
            const oracalBtn = document.createElement('button');
            oracalBtn.textContent = 'Раскладка Oracal';
            oracalBtn.title = 'Открыть калькулятор раскладки плёнки Oracal 641';
            oracalBtn.style.cssText = 'border:1px solid #388e3c;background:#e8f5e9;color:#2e7d32;border-radius:4px;padding:4px 12px;cursor:pointer;font:600 13px Arial;';
            oracalBtn.addEventListener('mouseenter', () => oracalBtn.style.background = '#c8e6c9');
            oracalBtn.addEventListener('mouseleave', () => oracalBtn.style.background = '#e8f5e9');
            oracalBtn.addEventListener('click', () => {
                window.open('https://www.creativepark.ru/orakal-641.html', '_blank', 'noopener');
            });

            const stockBtn = document.createElement('button');
            stockBtn.textContent = 'Склад';
            stockBtn.title = 'Открыть учёт склада материалов';
            stockBtn.style.cssText = 'border:1px solid #7b1fa2;background:#f3e5f5;color:#6a1b9a;border-radius:4px;padding:4px 12px;cursor:pointer;font:600 13px Arial;';
            stockBtn.addEventListener('mouseenter', () => stockBtn.style.background = '#e1bee7');
            stockBtn.addEventListener('mouseleave', () => stockBtn.style.background = '#f3e5f5');
            stockBtn.addEventListener('click', toggleStockModal);

            const cl = document.createElement('button');
            cl.textContent = '✕';
            cl.style.cssText = 'border:none;background:#e53935;color:#fff;width:28px;height:28px;border-radius:4px;cursor:pointer;font-size:15px;';
            cl.addEventListener('click', closeUnifiedModal);

            r.appendChild(ppBtn);
            r.appendChild(oracalBtn);
            r.appendChild(stockBtn);
            r.appendChild(cl);
            h.appendChild(ti);
            h.appendChild(r);

            const body = document.createElement('div');
            body.style.cssText = 'flex:1;display:flex;overflow:hidden;';

            const leftCol = document.createElement('div');
            leftCol.className = 'tm-shf-left';
            leftCol.style.cssText = 'flex:1;overflow:auto;';

            const sep1 = document.createElement('div');
            sep1.style.cssText = 'width:2px;background:#c9ccd1;flex:0 0 auto;';

            const rightCol = document.createElement('div');
            rightCol.className = 'tm-shf-right';
            rightCol.style.cssText = 'flex:1;overflow:auto;';

            body.appendChild(leftCol);
            body.appendChild(sep1);
            body.appendChild(rightCol);

            const footer = document.createElement('div');
            footer.className = 'tm-shf-footer';
            footer.style.cssText = 'padding:6px 14px;background:#f5f5f5;border-top:1px solid #ddd;font:13px Arial;color:#555;flex-shrink:0;';

            const footerToggle = document.createElement('span');
            footerToggle.style.cssText = 'cursor:pointer;color:#1565c0;font-weight:600;user-select:none;';
            footerToggle.textContent = '▶ Показать статистику';

            const footerStats = document.createElement('div');
            footerStats.style.cssText = 'display:none;margin-top:6px;padding-top:6px;border-top:1px dashed #ccc;line-height:1.7;';

            footerToggle.addEventListener('click', () => {
                const isOpen = footerStats.style.display !== 'none';
                footerStats.style.display = isOpen ? 'none' : 'block';
                footerToggle.textContent = isOpen ? '▶ Показать статистику' : '▼ Скрыть статистику';
            });

            const footerSave = document.createElement('span');
            footerSave.style.cssText = 'cursor:pointer;color:#2e7d32;font-weight:600;user-select:none;margin-left:14px;';
            footerSave.textContent = '💾 Сохранить отчёт';
            footerSave.title = 'Скачать статистику текущей недели файлом (без сброса)';
            footerSave.addEventListener('click', () => {
                const base = statsShared || loadStatsCache();
                if (!base || !exportStatsReport(base)) alert('Пока нет данных для отчёта');
            });

            footer.appendChild(footerToggle);
            footer.appendChild(footerSave);
            footer.appendChild(footerStats);

            b.appendChild(h);
            b.appendChild(body);
            b.appendChild(footer);
            o.appendChild(b);

            o.addEventListener('click', e => { if (e.target === o) closeUnifiedModal(); });
            document.body.appendChild(o);

            unifiedEl = { overlay: o, mainBox: b, left: leftCol, right: rightCol, footer: footer, footerStats: footerStats };
        } else {
            unifiedEl.overlay.style.display = 'flex';
        }

        unifiedOpen = true;
        setActive('tmShf', true);
        LOG.info('MODAL', 'открыта', { кэш: isCacheFresh() ? 'свежий' : 'устарел', left: (cacheShfLeft || []).length, right: (cacheShfRight || []).length });

        if (cacheShfLeft) renderShfColumn(unifiedEl.left, SHF_LEFT.title, cacheShfLeft, SHF_LEFT.value);
        if (cacheShfRight) renderShfColumn(unifiedEl.right, SHF_RIGHT.title, cacheShfRight, SHF_RIGHT.value);

        updateFooter();
        statsSync('открытие модалки');

        if (isCacheFresh()) {
            LOG.info('MODAL', 'кэш свежий, возраст сек:', Math.round((Date.now() - cacheTimestamp) / 1000));
            refreshReadinessInBackground();
            return;
        }

        runUnifiedScan();
    }

    function closeUnifiedModal() {
        if (unifiedEl) unifiedEl.overlay.style.display = 'none';
        if (prepressEl) prepressEl.style.display = 'none';
        prepressOpen = false;
        unifiedOpen = false;
        setActive('tmShf', false);
    }

    function toggleUnifiedModal() { unifiedOpen ? closeUnifiedModal() : openUnifiedModal(); }

    /* ===== МОДАЛКА ПРЕПРЕСС ===== */
    function togglePrepressModal() {
        prepressOpen ? closePrepressModal() : openPrepressModal();
    }

    function openPrepressModal() {
        if (!prepressEl) {
            const pOverlay = document.createElement('div');
            pOverlay.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,0.3);z-index:10;display:flex;align-items:center;justify-content:center;backdrop-filter: blur(2px);';

            const pBox = document.createElement('div');
            pBox.style.cssText = 'background:#fff;width:60%;height:50%;border-radius:8px;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,.5);overflow:hidden;border:1px solid #1565c0;';

            const pH = document.createElement('div');
            pH.style.cssText = 'padding:8px 14px;background:#e3f2fd;border-bottom:1px solid #1565c0;display:flex;align-items:center;justify-content:space-between;font:600 14px Arial;flex-shrink:0;';

            const pTi = document.createElement('span');
            pTi.textContent = 'Препресс';
            pTi.style.color = '#1565c0';

            const pClose = document.createElement('button');
            pClose.textContent = '✕ Закрыть';
            pClose.style.cssText = 'border:1px solid #1565c0;background:#fff;color:#1565c0;border-radius:4px;padding:2px 8px;cursor:pointer;font:14px Arial;';
            pClose.addEventListener('click', closePrepressModal);

            pH.appendChild(pTi);
            pH.appendChild(pClose);

            const pBody = document.createElement('div');
            pBody.style.cssText = 'flex:1;overflow:auto;padding:0;';

            pBox.appendChild(pH);
            pBox.appendChild(pBody);
            pOverlay.appendChild(pBox);

            unifiedEl.mainBox.appendChild(pOverlay);

            prepressEl = pOverlay;
            prepressEl._body = pBody;
        } else {
            prepressEl.style.display = 'flex';
        }

        prepressOpen = true;
        runPrepressScan();
    }

    function closePrepressModal() {
        if (prepressEl) prepressEl.style.display = 'none';
        prepressOpen = false;
    }

    function renderPrepressTable(rows) {
        if (!prepressEl || !prepressEl._body) return;
        const container = prepressEl._body;

        if (!rows.length) {
            container.innerHTML = `
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#555;font:16px Arial;text-align:center;padding:20px;">
                    <div style="font-size:48px;margin-bottom:10px;">✅</div>
                    <div style="font-weight:600;font-size:16px;color:#2e7d32;">Все заказы обработаны</div>
                    <div style="margin-top:5px;color:#888;">Нет заказов в работе на участках 1 ШФ / 14 ШФ</div>
                </div>`;
            return;
        }

        const head = PREPRESS_COL_HEADERS.map(h => `<th style="padding:6px 10px;text-align:left;border-bottom:2px solid #cfd8dc;background:#eceff1;position:sticky;top:0;z-index:2;font:600 14px Arial;white-space:nowrap;">${escapeHtml(h)}</th>`).join('');
        const body = rows.map((r, i) => {
            const bg = r.isLocked ? '#fff9c4' : (i % 2 ? '#fafafa' : '#fff');
            const lockIcon = r.isLocked ? ' 🔒' : '';

            return `<tr class="tm-prepress-row" data-pid="${escapeHtml(r.productId)}" data-num="${escapeHtml(r.orderNum)}" style="background:${bg};cursor:pointer;">
                <td style="padding:5px 10px;border-bottom:1px solid #eee;color:#1565c0;font-weight:600;white-space:nowrap;font-size:14px;">${escapeHtml(r.orderNum)}${lockIcon}</td>
                <td style="padding:5px 10px;border-bottom:1px solid #eee;font-size:14px;">${escapeHtml(r.client || '—')}</td>
                <td style="padding:5px 10px;border-bottom:1px solid #eee;font-size:14px;">${escapeHtml(r.title || '—')}</td>
                <td style="padding:5px 10px;border-bottom:1px solid #eee;white-space:nowrap;font-size:14px;">${escapeHtml(r.manager || '—')}</td>
            </tr>`;
        }).join('');

        container.innerHTML = `<table class="tm-prepress-table" style="width:100%;border-collapse:collapse;font:14px Arial;"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;

        container.querySelectorAll('.tm-prepress-row').forEach(tr => {
            tr.addEventListener('mouseenter', () => tr.style.background = '#e3f2fd');
            tr.addEventListener('mouseleave', () => {
                const pid = tr.dataset.pid;
                const row = (cachePrepress || []).find(r => r.productId === pid);
                if (row && row.isLocked) {
                    tr.style.background = '#fff9c4';
                } else {
                    tr.style.background = (parseInt(tr.rowIndex) % 2 === 0 ? '#fff' : '#fafafa');
                }
            });
            tr.addEventListener('click', () => openPrepressOrder(tr.dataset.pid, tr.dataset.num));
        });
    }

    function openPrepressOrder(productId, orderNum) {
        LOG.info('OPEN', 'заказ из препресса', { id: productId, способ: 'ShowPostpressForm' });
        closeUnifiedModal();
        try {
            if (typeof window.ShowPostpressForm === 'function') {
                window.ShowPostpressForm(productId, 'postpress');
                return;
            }
        } catch (e) {}
        try {
            if (window.jQuery) {
                try { if (typeof window.ShowDocLoader === 'function') window.ShowDocLoader('Загружаем заказ…'); } catch (e) {}
                window.jQuery.post('doc/Workflow/Product/Form.php', { id: productId, Sector: 0, ActiveTab: 'postpress', tab: 'postpress' }, function (msg) {
                    window.jQuery('#Doc').html(msg);
                    try { if (typeof window.HideDocLoader === 'function') window.HideDocLoader(); } catch (e) {}
                });
                return;
            }
        } catch (e) {}
        window.location.href = ORDER_URL_TPL.replace('{v}', encodeURIComponent(productId));
    }

async function fetchPrepressOrdersViaIframe() {
        return new Promise((resolve) => {
            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:1400px;height:900px;border:0;';
            iframe.src = PREPRESS_URL;
            document.body.appendChild(iframe);
            let attempts = 0;
            LOG.debug('IFRAME-PP', 'загрузка препресса начата');

            const stopWords = /^(постпечать|препресс|печать|упаковка|резка|выбрать)$/i;
            const isTime = (s) => /^\d{1,2}[.:]\d{2}$/.test(s) || /^(сегодня|завтра|вчера)\b/i.test(s) || /^\d{2}[./]\d{2}/.test(s);

            const checkInterval = setInterval(() => {
                attempts++;
                try {
                    const doc = iframe.contentDocument;
                    if (!doc) return;

                    // 1) старый дизайн
                    let table = doc.querySelector('.ax-table-body table') || doc.querySelector('table.table');
                    let oldDesign = !!table;

                    // 2) fallback: любая таблица, где первая ячейка строки — номер заказа
                    if (!table) {
                        const tables = Array.from(doc.querySelectorAll('table'));
                        for (const t of tables) {
                            let hits = 0;
                            t.querySelectorAll('tbody tr, tr').forEach(tr => {
                                const first = tr.querySelector('td');
                                if (first && /^\s*\d{3,}/.test(first.textContent || '')) hits++;
                            });
                            if (hits >= 1) { table = t; break; }
                        }
                    }

                    if (table) {
                        const trs = Array.from(table.querySelectorAll('tbody tr, tr'));
                        const orders = [];
                        trs.forEach(tr => {
                            const cells = Array.from(tr.querySelectorAll('td'));
                            if (cells.length < 2) return;
                            const getText = (idx) => { if (!cells[idx]) return ''; const span = cells[idx].querySelector('span'); return span ? span.textContent.trim() : cells[idx].textContent.trim(); };

                            // номер заказа: первая ячейка с числом
                            let orderNum = '', numIdx = -1;
                            for (let i = 0; i < Math.min(cells.length, 3); i++) {
                                const t = getText(i);
                                if (/^\d{3,}$/.test(t)) { orderNum = t; numIdx = i; break; }
                            }
                            if (!orderNum) return;

                            // замок: старый img или новый ax-icon/use
                            let isLocked = !!tr.querySelector('img[src*="lock"]');
                            if (!isLocked) {
                                tr.querySelectorAll('ax-icon, use').forEach(el => {
                                    const token = (el.getAttribute('name') || '') + ' ' + (el.getAttribute('href') || el.getAttribute('xlink:href') || '');
                                    if (/lock/.test(token)) isLocked = true;
                                });
                            }

                            // колонки: для старого дизайна — известные индексы, иначе эвристика
                            let client = getText(6), title = getText(8), manager = getText(9);
                            if (!client && !title) {
                                const pick = cells
                                    .map((c, i) => ({ i, t: getText(i) }))
                                    .filter(x => x.t && x.i !== numIdx && !stopWords.test(x.t) && !isTime(x.t) && !/^\d+$/.test(x.t));
                                client = pick[0] ? pick[0].t : '';
                                title = pick[1] ? pick[1].t : '';
                                manager = pick[2] ? pick[2].t : '';
                            }

                            const orderId = tr.getAttribute('data-id') || (tr.getAttribute('onclick') || '').match(/(\d+)/)?.[1] || orderNum;
                            orders.push({ orderNum, orderId, client, title, manager, isLocked });
                        });

                        if (orders.length > 0) {
                            clearInterval(checkInterval);
                            iframe.remove();
                            LOG.info('IFRAME-PP', 'препресс список готов', { заказов: orders.length, попыток: attempts, дизайн: oldDesign ? 'старый' : 'новый', таблица: table.className || 'без класса' });
                            resolve(orders);
                            return;
                        }
                    }
                } catch (e) {
                    LOG.debug('IFRAME-PP', 'ошибка poll', e);
                }
                if (attempts >= 30) {
                    clearInterval(checkInterval);
                    let snippet = '';
                    try { snippet = (iframe.contentDocument.body.innerText || '').replace(/\s+/g, ' ').slice(0, 200); } catch (e) {}
                    iframe.remove();
                    LOG.warn('IFRAME-PP', 'таймаут: таблица не найдена', { фрагмент: snippet });
                    resolve([]);
                }
            }, 500);
        });
    }

async function checkOrderSections(orderId, orderNum) {
        try {
            const formData = new URLSearchParams();
            formData.append('id', orderId);
            formData.append('Sector', '0');
            formData.append('ActiveTab', 'postpress');
            formData.append('tab', 'postpress');
            const res = await fetch('/axiom/doc/Workflow/Product/Form.php', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                body: formData.toString()
            });
            const html = await res.text();

            // 1) Старый дизайн: тексты участков есть прямо в ответе
            const direct = TXT_SECTIONS.filter(s => html.includes(s));
            if (direct.length) return direct;

            const quickDoc = new DOMParser().parseFromString(html, 'text/html');
            const viaText = TXT_SECTIONS.filter(s => (quickDoc.body.innerText || '').includes(s));
            if (viaText.length) return viaText;

            // 2) V2: сырой ответ — пустая оболочка Vue. Рендерим форму в iframe и читаем участки из операций
            if (quickDoc.querySelector('.product-form-v2-host')) {
                const doc = await loadFormDoc(orderId, 12000);
                if (!doc) return [];

                const found = new Set();
                doc.querySelectorAll('article.pfv2-postpress-operation').forEach(op => {
                    const sStrong = op.querySelector('.pfv2-postpress-operation__sector strong');
                    if (!sStrong) return;
                    const num = parseInt(sStrong.textContent.trim(), 10) || 0;
                    if (num === 1) found.add('1 ШФ');
                    if (num === 14) found.add('14 ШФ Постпечать');
                });
                if (found.size) {
                    LOG.debug('PREPRESS', 'участки из V2', { id: orderId, участки: [...found] });
                    return [...found];
                }

                // страховка: текстовые маркеры в отрендеренном DOM
                const text = (doc.body.innerText || '');
                return TXT_SECTIONS.filter(s => text.includes(s));
            }

            return [];
        } catch (e) {
            LOG.error('PREPRESS', 'ошибка checkOrderSections', orderId, e);
            return [];
        }
    }

    async function runPrepressScan() {
        if (prepressBusy) return;
        prepressBusy = true;
        const tPP = timer('скан препресса');

        if (prepressEl && prepressEl._body) {
            prepressEl._body.innerHTML = `
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#555;font:14px Arial;">
                    <div style="font-size:24px;margin-bottom:10px;animation:spin 1s linear infinite;">⏳</div>
                    <div>Загрузка списка заказов...</div>
                </div>
                <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>`;
        }

        try {
            const prepressOrders = await fetchPrepressOrdersViaIframe();
            LOG.info('PREPRESS', 'список получен', { заказов: prepressOrders.length });

            const prepressResults = await parallelLimit(prepressOrders, async (o) => {
                const found = await checkOrderSections(o.orderId, o.orderNum);
                if (found.length) return {
                    orderNum: o.orderNum,
                    productId: o.orderId,
                    client: o.client,
                    title: o.title,
                    manager: o.manager,
                    isLocked: o.isLocked,
                    sections: [...new Set(found)]
                };
                return null;
            }, 5);

            const prepressResult = prepressResults.filter(Boolean);
            cachePrepress = prepressResult;
            renderPrepressTable(prepressResult);
            LOG.info('PREPRESS', 'скан завершён', { совпало: prepressResult.length, вРаботе: prepressResult.filter(r => r.isLocked).length });
            tPP.stop('PREPRESS');
        } catch (e) {
            LOG.error('PREPRESS', 'ошибка', e);
            if (prepressEl && prepressEl._body) {
                prepressEl._body.innerHTML = `<div style="padding:20px;color:#c62828;text-align:center;">Ошибка загрузки: ${escapeHtml(e.message)}</div>`;
            }
        } finally {
            prepressBusy = false;
        }
    }

    /* --- рендер ШФ --- */
    function renderShfColumn(container, title, rows, sectorValue) {
        if (!rows.length) {
            container.innerHTML = `<div style="padding:14px;font:600 14px Arial;background:#eceff1;position:sticky;top:0;z-index:2;">${escapeHtml(title)}</div><div style="padding:24px;font:14px Arial;color:#555;">Нет заказов.</div>`;
            return;
        }
        const head = COL_HEADERS_SHF.map(h => `<th style="padding:8px 10px;text-align:left;border-bottom:2px solid #cfd8dc;background:#eceff1;position:sticky;top:0;z-index:2;font:600 15px Arial;white-space:nowrap;">${escapeHtml(h)}</th>`).join('');

        const body = rows.map((r, i) => {
            const tds = r.cells.map((c, idx) => {
                const right = c.alignRight ? 'text-align:right;' : '';
                const bold = /bold/.test(c.cls) ? 'font-weight:700;' : '';
                const content = c.html || escapeHtml(c.text);
                const fontSize = idx === 2 ? 'font-size:13px;line-height:1.4;' : '';

                let cellContent = content;
                if (idx === 0) {
                    const numHtml = `<div style="color:#1565c0;font-weight:600;text-align:center;">${escapeHtml(r.displayNum)}</div>`;
                    const stopHtml = r._isStopped ? `<div style="text-align:center;margin-top:2px;"><span title="Заказ на СТОПЕ" style="color:red;font-size:14px;">⛔</span></div>` : '';
                    cellContent = numHtml + stopHtml;
                }

                return `<td style="padding:7px 10px;border-bottom:1px solid #eee;${right}${bold}${fontSize}">${cellContent}</td>`;
            }).join('');

            let rowBg;
            if (r._isStopped) {
                rowBg = '#e0e0e0';
            } else {
                rowBg = ROW_COLORS[r._status] || (i % 2 ? '#fafafa' : '#fff');
            }

            return `<tr class="tm-shf-row" data-pid="${escapeHtml(r.productId)}" style="background:${rowBg};cursor:pointer;">${tds}</tr>`;
        }).join('');

        container.innerHTML = `<div style="padding:14px;font:600 15px Arial;background:#cfd8dc;position:sticky;top:0;z-index:3;border-bottom:2px solid #b0bec5;">${escapeHtml(title)} <span style="font-weight:400;color:#555;">(${rows.length})</span></div><table class="tm-shf-${sectorValue}" style="width:100%;border-collapse:collapse;font:15px Arial;"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;

        container.querySelectorAll('.tm-shf-row').forEach(tr => {
            tr.addEventListener('mouseenter', () => tr.style.background = '#e3f2fd');
            tr.addEventListener('mouseleave', () => {
                const pid = tr.dataset.pid;
                const allRows = [...(cacheShfLeft || []), ...(cacheShfRight || [])];
                const row = allRows.find(r => r.productId === pid);

                let bg;
                if (row && row._isStopped) {
                    bg = '#e0e0e0';
                } else {
                    const st = row && row._status ? row._status : 'unknown';
                    bg = ROW_COLORS[st] || (parseInt(tr.rowIndex) % 2 === 0 ? '#fff' : '#fafafa');
                }
                tr.style.background = bg;
            });
            tr.addEventListener('click', () => openOrder(tr.dataset.pid));
        });
    }

    function openOrder(productId) {
        LOG.info('OPEN', 'заказ из ШФ', { id: productId, способ: 'jQuery.post' });
        closeUnifiedModal();
        try {
            if (window.jQuery) {
                try { if (typeof window.ShowDocLoader === 'function') window.ShowDocLoader('Загружаем заказ…'); } catch (e) {}
                var sector = 0;
                try { sector = window.jQuery('#Sector').val() || 0; } catch (e) {}
                window.jQuery.post('doc/Workflow/Product/Form.php', { id: productId, Sector: sector, ActiveTab: 'postpress', tab: 'postpress' }, function (msg) {
                    window.jQuery('#Doc').html(msg);
                    try { if (typeof window.HideDocLoader === 'function') window.HideDocLoader(); } catch (e) {}
                });
                return;
            }
        } catch (e) {}
        LOG.info('OPEN', 'заказ из ШФ', { id: productId, способ: 'URL' });
        window.location.href = ORDER_URL_TPL.replace('{v}', encodeURIComponent(productId));
    }

    /* --- Парсинг операций (V1 + V2) --- */
    function parseOperations(doc, sectorFilter, isV2 = false) {
        if (isV2) {
            // ===== НОВЫЙ ИНТЕРФЕЙС (V2) =====
            const allOps = [];
            const articles = Array.from(doc.querySelectorAll('article.pfv2-order-shell'));

            articles.forEach((article, idx) => {
                const titleEl = article.querySelector('.axui-block__title, h2');
                const summaryEl = article.querySelector('.pfv2-order-title-summary');
                const title = titleEl ? titleEl.textContent.trim() : '';
                const summary = summaryEl ? summaryEl.textContent.trim() : '';
                const label = title + (summary ? ` ${summary}` : '');

                const ops = [];
                const opArticles = Array.from(article.querySelectorAll('article.pfv2-postpress-operation'));

                opArticles.forEach(opArt => {
                    const sectorStrong = opArt.querySelector('.pfv2-postpress-operation__sector strong');
                    if (!sectorStrong) return;
                    const sectorNum = parseInt(sectorStrong.textContent.trim(), 10) || 0;

                    if (sectorFilter === '5' && sectorNum !== 1) return;
                    if (sectorFilter === '86' && sectorNum !== 14) return;

                    const nameStrong = opArt.querySelector('.pfv2-postpress-operation__main strong');
                    const opText = nameStrong ? nameStrong.textContent.trim() : '';
                    if (!opText) return;

                    const isComplete = opArt.classList.contains('is-complete');

                    const qtyEl = opArt.querySelector('.pfv2-postpress-operation__metric.is-quantity strong');
                    const doneEl = opArt.querySelector('.pfv2-postpress-operation__metric.is-done strong');
                    let qtyTotal = qtyEl ? (qtyEl.textContent.trim().match(/\d+/) || ['0'])[0] : '0';
                    let qtyDone = doneEl ? (doneEl.textContent.trim().match(/\d+/) || ['0'])[0] : '0';

                    // У завершённых свёрнутых операций метрик нет — берём из summary "Готово X из Y экз."
                    if (isComplete) {
                        const sumStrong = opArt.querySelector('.pfv2-postpress-operation__summary strong');
                        if (sumStrong) {
                            const sm = sumStrong.textContent.match(/(\d+)\s+из\s+(\d+)/);
                            if (sm) { qtyDone = sm[1]; qtyTotal = sm[2]; }
                        }
                    }

                    const progress = `<b>[${qtyDone}/${qtyTotal}]</b>`;
                    const lineContent = `${opText} ${progress}`;

                    ops.push(isComplete
                        ? `<s style="color:#888;">${lineContent}</s>`
                        : lineContent);
                });

                if (ops.length > 0) {
                    if (idx > 0 && allOps.length > 0) allOps.push('<br>');
                    if (label) allOps.push(`<b>${escapeHtml(label)}</b>`);
                    allOps.push(...ops);
                }
            });

            return allOps.map(item => {
                if (item.startsWith('<b>') || item === '<br>') {
                    return `<div style="margin-top:6px;font-weight:600;">${item.replace(/<br>/g, '')}</div>`;
                }
                return `<div style="padding-left:12px;">• ${item}</div>`;
            }).join('');
        }

        // ===== СТАРЫЙ ИНТЕРФЕЙС (V1) =====
        const allOps = [];
        const formblocks = Array.from(doc.querySelectorAll('#Postpress .formblock[class*="Order"]'));

        const processBlock = (block) => {
            const sectorCell = block.querySelector('.sector');
            if (!sectorCell) return null;

            const sectorText = sectorCell.textContent.replace(/\s+/g, ' ').trim();
            const sectorNumMatch = sectorText.match(/^(\d+)/);
            const sectorNum = sectorNumMatch ? parseInt(sectorNumMatch[1], 10) : 0;

            if (sectorFilter === '5' && sectorNum !== 1) return null;
            if (sectorFilter === '86' && sectorNum !== 14) return null;

            const opName = block.querySelector('h5');
            const instruction = block.querySelector('.Instruction');
            const doneBtn = block.querySelector('button[disabled="disabled"]');
            const isDone = doneBtn && /Готово/i.test(doneBtn.textContent);

            const opText = opName ? opName.textContent.trim() : '';
            const instrText = instruction ? instruction.textContent.trim() : '';

            const infoValues = block.querySelectorAll('.info .value');
            let qtyTotal = '0', qtyDone = '0';

            if (infoValues.length >= 2) {
                const totalMatch = infoValues[1].textContent.match(/(\d+)/);
                if (totalMatch) qtyTotal = totalMatch[1];
            }

            const progressEl = block.querySelector('[id^="progress_control_"]');
            if (progressEl) {
                const doneMatch = progressEl.textContent.match(/(\d+)/);
                if (doneMatch) qtyDone = doneMatch[1];
            } else if (infoValues.length >= 3) {
                const doneMatch = infoValues[2].textContent.match(/(\d+)/);
                if (doneMatch) qtyDone = doneMatch[1];
            }

            if (opText) {
                const progress = `<b>[${qtyDone}/${qtyTotal}]</b>`;
                let lineContent = instrText ? `${opText} (${instrText}) ${progress}` : `${opText} ${progress}`;
                if (isDone) return `<s style="color:#888;">${lineContent}</s>`;
                else return lineContent;
            }
            return null;
        };

        formblocks.forEach((fb, index) => {
            const orderNameEl = fb.querySelector('.OrderName');
            const orderInfoSpan = fb.querySelector('h4 span[style*="font-weight: normal"]');
            const orderName = orderNameEl ? orderNameEl.textContent.trim() : '';
            const orderInfo = orderInfoSpan ? orderInfoSpan.textContent.trim() : '';
            const orderLabel = orderName + (orderInfo ? ` ${orderInfo}` : '');

            const blocks = Array.from(fb.querySelectorAll('.postpressblock'));
            const ops = blocks.map(processBlock).filter(Boolean);

            if (ops.length > 0) {
                if (index > 0 && allOps.length > 0) allOps.push('<br>');
                if (orderLabel) allOps.push(`<b>${escapeHtml(orderLabel)}</b>`);
                allOps.push(...ops);
            }
        });

        if (allOps.length === 0) {
            const postpressBlocks = Array.from(doc.querySelectorAll('#Postpress .postpressblock'));
            postpressBlocks.forEach(block => {
                const op = processBlock(block);
                if (op) allOps.push(op);
            });
        }

        return allOps.map(item => {
            if (item.startsWith('<b>') || item === '<br>') {
                return `<div style="margin-top:6px;font-weight:600;">${item.replace(/<br>/g, '')}</div>`;
            }
            return `<div style="padding-left:12px;">• ${item}</div>`;
        }).join('');
    }

    /* ===== ДАТЫ / СТАТУСЫ / РЕНДЕР ФОРМЫ ===== */
    const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    const MONTHS_RU = { 'янв':0,'фев':1,'мар':2,'апр':3,'май':4,'июн':5,'июл':6,'авг':7,'сен':8,'окт':9,'ноя':10,'дек':11 };

    function parseRuDue(s) {
        const m = (s || '').match(/(\d{1,2})\s+([а-яё]+)\s+(\d{1,2}):(\d{2})/i);
        if (!m) return null;
        const mon = MONTHS_RU[m[2].slice(0, 3).toLowerCase()];
        if (mon === undefined) return null;
        return new Date(new Date().getFullYear(), mon, parseInt(m[1], 10), parseInt(m[3], 10), parseInt(m[4], 10));
    }

    function detectStatuses(doc) {
        let isPostpressReady = false, isPacked = false, isStopped = false;
        // V2: ax-icon / use
        doc.querySelectorAll('ax-icon, use').forEach(el => {
            const name = el.getAttribute('name') || '';
            const href = el.getAttribute('href') || el.getAttribute('xlink:href') || '';
            const token = name || href;
            if (/status-postpress-ready/.test(token)) isPostpressReady = true;
            if (/status-pack/.test(token)) isPacked = true;
            if (/stop/.test(token)) isStopped = true;
        });
        // V1: img
        const statusImg = doc.querySelector('.StatusIcon img');
        if (statusImg) {
            const src = statusImg.getAttribute('src') || '';
            if (/status-pack\.png/.test(src)) isPacked = true;
            if (/status-postpress-ready\.png/.test(src)) isPostpressReady = true;
        }
        const stopSpan = doc.querySelector('.StopIcon');
        if (stopSpan && stopSpan.querySelector('img')) isStopped = true;
        return { isPostpressReady, isPacked, isStopped };
    }

    // Рендерит форму заказа в скрытом iframe (скрипты выполняются!) и отдаёт живой DOM
    function loadFormDoc(productId, timeoutMs = 15000) {
        return new Promise((resolve) => {
            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:1400px;height:1600px;border:0;';
            iframe.src = SHF_PAGE_URL;
            document.body.appendChild(iframe);
            const t0 = Date.now();
            let started = false, finished = false;
            const finish = (doc) => {
                if (finished) return;
                finished = true;
                clearInterval(poll);
                clearTimeout(to);
                iframe.remove();
                resolve(doc);
            };
            const to = setTimeout(() => finish(null), timeoutMs);
            const poll = setInterval(() => {
                try {
                    const win = iframe.contentWindow;
                    const doc = iframe.contentDocument;
                    if (!win || !doc || !doc.body) return;
                    if (!started && typeof win.ShowPostpressForm === 'function') {
                        started = true;
                        try { win.ShowPostpressForm(productId, 'postpress'); } catch (e) {}
                        return;
                    }
                    if (!started) return;
                    const v1Ready = doc.querySelector('#Postpress .postpressblock') || doc.querySelector('#Postpress .formblock') || doc.querySelector('input.ProductName');
                    const v2Ready = doc.querySelector('h1.name') && (doc.querySelector('article.pfv2-postpress-operation') || doc.querySelector('.pfv2-postpress-operations') || doc.querySelector('.pfv2-order-shell'));
                    if (v1Ready || v2Ready) { finish(doc); return; }
                    const headerOnly = doc.querySelector('h1.name') || doc.querySelector('input.ProductName');
                    if (headerOnly && Date.now() - t0 > 6000) { finish(doc); return; }
                } catch (e) {}
            }, 300);
        });
    }

    async function fetchReadiness(productId, sectorFilter) {
        try {
            const doc = await loadFormDoc(productId);
            if (!doc) {
                LOG.warn('READY', 'форма не отрендерилась (таймаут)', productId);
                return { text: '—', status: 'unknown', title: '', tirazh: '', qty: 0, description: '', isStopped: false, isPacked: false, isPostpressReady: false, materials: [], products: [] };
            }

            const isV2 = !!(doc.querySelector('.product-form-v2-host') || doc.querySelector('.pfv2-postpress-operation'));
            LOG.debug('READY', productId, { версия: isV2 ? 'V2' : 'V1' });

            // НАЗВАНИЕ
            let orderTitle = '';
            if (isV2) {
                const h1 = doc.querySelector('h1.name');
                if (h1) orderTitle = h1.textContent.trim();
            }
            if (!orderTitle) {
                const nameInput = doc.querySelector('input.ProductName');
                if (nameInput) orderTitle = nameInput.value.trim();
            }

            // ТИРАЖ
            let tirazh = '';
            if (isV2) {
                const qNum = doc.querySelector('.quantity-value .number');
                if (qNum) tirazh = qNum.textContent.trim();
            }
            if (!tirazh) {
                const tirazhEl = doc.querySelector('.Tirazh, #Tirazh');
                if (tirazhEl) tirazh = tirazhEl.textContent.trim();
            }

            // КОЛИЧЕСТВО ИЗДЕЛИЙ ЗАКАЗА (для статистики изделий)
            const qtyNum = parseInt((tirazh || '').replace(/[^\d]/g, ''), 10) || 0;

            // СТАТУСЫ
            const st = detectStatuses(doc);

            // ДАТА ГОТОВНОСТИ
            let rawText = '';
            let v2Due = null;
            const htmlStr = doc.documentElement.innerHTML || '';
            const productMatch = htmlStr.match(/PlanSend:\s*"([^"]+)"/);
            if (productMatch && productMatch[1]) {
                try {
                    rawText = JSON.parse(`"${productMatch[1]}"`);
                } catch (e) {
                    rawText = productMatch[1].replace(/\\u([0-9a-fA-F]{4})/g, (m, g) => String.fromCharCode(parseInt(g, 16)));
                    rawText = rawText.replace(/\\\//g, '/');
                }
            }
            if (!rawText) {
                const dateReady = doc.querySelector('.DateReady');
                const planReady = doc.querySelector('.PlanReady');
                if (dateReady && planReady) rawText = dateReady.textContent.trim() + ' ' + planReady.textContent.trim();
                else if (dateReady) rawText = dateReady.textContent.trim();
            }
            if (!rawText && isV2) {
                const dues = [];
                doc.querySelectorAll('.pfv2-postpress-operation__metric.is-due strong').forEach(el => {
                    const d = parseRuDue(el.textContent);
                    if (d) dues.push(d);
                });
                if (dues.length) v2Due = new Date(Math.max(...dues.map(d => d.getTime())));
            }

            // ОПЕРАЦИИ
            const description = parseOperations(doc, sectorFilter, isV2);

            // СТАТУС ПО ДАТЕ
            let status = 'unknown', text = rawText || '—';
            let readyDate = null, timeStr = '';
            const dateMatch = rawText.match(/(\d{2})[\/.\-](\d{2})[\/.\-](\d{4})[\s]+(\d{2}:\d{2})/);
            if (dateMatch) {
                readyDate = new Date(parseInt(dateMatch[3], 10), parseInt(dateMatch[2], 10) - 1, parseInt(dateMatch[1], 10));
                timeStr = dateMatch[4];
            } else if (v2Due) {
                readyDate = new Date(v2Due.getFullYear(), v2Due.getMonth(), v2Due.getDate());
                timeStr = String(v2Due.getHours()).padStart(2, '0') + ':' + String(v2Due.getMinutes()).padStart(2, '0');
                text = `${v2Due.getDate()} ${MONTHS_SHORT[v2Due.getMonth()]} ${timeStr}`;
            }
            if (readyDate) {
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const tomorrow = new Date(today.getTime() + 86400000);
                if (readyDate.getTime() < today.getTime()) { status = 'overdue'; }
                else if (readyDate.getTime() === today.getTime()) { status = 'today'; text = `Сегодня ${timeStr}`; }
                else {
                    status = 'future';
                    if (readyDate.getTime() === tomorrow.getTime()) text = `Завтра ${timeStr}`;
                }
            }

            // МАТЕРИАЛЫ
            const materials = [];
            if (isV2) {
                doc.querySelectorAll('article.pfv2-postpress-operation .pfv2-postpress-operation__main strong').forEach(strong => {
                    const name = MATERIAL_MAP_NORM[normStr(strong.textContent)];
                    if (name && !materials.includes(name)) materials.push(name);
                });
            } else {
                Array.from(doc.querySelectorAll('#Postpress .postpressblock h5')).forEach(h5 => {
                    const name = MATERIAL_MAP_NORM[normStr(h5.textContent)];
                    if (name && !materials.includes(name)) materials.push(name);
                });
            }

            // ИЗДЕЛИЯ
            const productNames = [];
            if (isV2) {
                doc.querySelectorAll('h2.axui-block__title').forEach(el => {
                    const t = el.textContent.trim();
                    if (t) productNames.push(t);
                });
                if (productNames.length === 0) {
                    const h1 = doc.querySelector('h1.name');
                    if (h1) productNames.push(h1.textContent.trim());
                }
            } else {
                doc.querySelectorAll('.formblock .OrderName').forEach(el => {
                    const t = el.textContent.trim();
                    if (t) productNames.push(t);
                });
                if (productNames.length === 0) {
                    const nameInput = doc.querySelector('input.ProductName');
                    if (nameInput) productNames.push(nameInput.value.trim());
                }
            }

            const products = [];
            productNames.forEach(name => {
                PRODUCT_RULES.forEach(rule => {
                    if (rule.pattern.test(name) && !products.includes(rule.display)) {
                        products.push(rule.display);
                    }
                });
            });

            LOG.debug('READY', productId, {
                версия: isV2 ? 'V2' : 'V1',
                status, isPacked: st.isPacked, isStopped: st.isStopped, isPostpressReady: st.isPostpressReady,
                qty: qtyNum, материалов: materials.length, изделий: products.length
            });

            return { text, status, title: orderTitle, tirazh, qty: qtyNum, description, isStopped: st.isStopped, isPacked: st.isPacked, isPostpressReady: st.isPostpressReady, materials, products };

        } catch (e) {
            LOG.error('READY', 'ошибка', productId, e);
            return { text: '—', status: 'unknown', title: '', tirazh: '', qty: 0, description: '', isStopped: false, isPacked: false, isPostpressReady: false, materials: [], products: [] };
        }
    }

    function updateShfRowDom(row) {
        let rowBg;
        if (row._isStopped) {
            rowBg = '#e0e0e0';
        } else {
            rowBg = ROW_COLORS[row._status] || '';
        }

        [SHF_LEFT.value, SHF_RIGHT.value].forEach(val => {
            const tables = document.querySelectorAll(`table.tm-shf-${val}`);
            tables.forEach(tbl => {
                const tbody = tbl.querySelector('tbody');
                if (!tbody) return;

                const matchTr = Array.from(tbody.children).find(tr => tr.dataset.pid === row.productId);

                if (matchTr) {
                    if (matchTr.children[0]) {
                        const numHtml = `<div style="color:#1565c0;font-weight:600;text-align:center;">${escapeHtml(row.displayNum)}</div>`;
                        const stopHtml = row._isStopped ? `<div style="text-align:center;margin-top:2px;"><span title="Заказ на СТОПЕ" style="color:red;font-size:14px;">⛔</span></div>` : '';
                        matchTr.children[0].innerHTML = numHtml + stopHtml;
                    }
                    if (matchTr.children[1] && row.cells[1]) matchTr.children[1].textContent = row.cells[1].text;
                    if (matchTr.children[2] && row.cells[2]) matchTr.children[2].innerHTML = row.cells[2].html || row.cells[2].text;
                    if (matchTr.children[3] && row.cells[3]) matchTr.children[3].textContent = row.cells[3].text;
                    const lastTd = matchTr.lastElementChild;
                    if (lastTd && row.cells[4]) lastTd.textContent = row.cells[4].text;
                    if (rowBg) matchTr.style.background = rowBg;
                    else matchTr.style.background = '';
                } else {
                    LOG.debug('DOM', 'строка не найдена в таблице', row.productId);
                }
            });
        });
    }

    async function fetchViaIframe(sectorValue) {
        return new Promise((resolve) => {
            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:1400px;height:900px;border:0;';
            iframe.src = SHF_PAGE_URL;
            document.body.appendChild(iframe);
            let attempts = 0;
            LOG.debug('IFRAME', 'SHF загрузка, сектор', sectorValue);
            const checkInterval = setInterval(() => {
                attempts++;
                try {
                    const doc = iframe.contentDocument;
                    const win = iframe.contentWindow;
                    if (!doc || !win) return;
                    if (attempts === 1) {
                        try {
                            if (win.SetSector) win.SetSector(sectorValue);
                            if (win.ShowSectorList) win.ShowSectorList();
                            if (win.jQuery) { win.jQuery('#Sector').val(sectorValue); win.jQuery('#Sector').trigger('change'); }
                        } catch (e) {}
                    }
                    const table = doc.querySelector('.ax-table-body table, table.table');
                    if (table) {
                        const trs = Array.from(table.querySelectorAll('tbody tr'));
                        const rows = [];
                        const seenOrders = new Set();
                        trs.forEach(tr => {
                            const tds = Array.from(tr.querySelectorAll('td'));
                            if (tds.length < 3) return;
                            if (!/\d{3,}/.test(tr.textContent || '')) return;
                            const cells = tds.map(td => { const span = td.querySelector('span'); return { text: span ? span.textContent.trim() : td.textContent.trim(), html: '', cls: td.className || '', alignRight: /right/.test(td.className || '') }; });
                            const numText = cells[0].text;
                            const m = numText.match(/(\d+)\s*\/\s*(\d+)/);
                            const displayNum = m ? m[1] : numText.replace(/\D/g, '');
                            const productId = m ? m[1] : numText.replace(/\D/g, '');
                            if (seenOrders.has(productId)) return;
                            seenOrders.add(productId);
                            const qtyText = cells[6] ? cells[6].text : '';
                            const qtyMatch = qtyText.match(/(\d+)/);
                            const qtyClean = qtyMatch ? qtyMatch[1] : qtyText;
                            rows.push({ displayNum, productId, cells: [
                                cells[0],
                                cells[3] || { text: '', html: '', cls: '', alignRight: false },
                                { text: '⏳', html: '', cls: '', alignRight: false },
                                { text: qtyClean, html: '', cls: cells[6] ? cells[6].cls : '', alignRight: true },
                                { text: '⏳', html: '', cls: '', alignRight: false }
                            ], _status: 'unknown' });
                        });
                        if (rows.length > 0) {
                            clearInterval(checkInterval);
                            iframe.remove();
                            LOG.info('IFRAME', 'SHF готов', { сектор: sectorValue, строк: rows.length, попыток: attempts });
                            resolve(rows);
                            return;
                        }
                    }
                } catch (e) {}
                if (attempts >= 30) {
                    clearInterval(checkInterval);
                    iframe.remove();
                    LOG.warn('IFRAME', 'SHF таймаут', { сектор: sectorValue });
                    resolve([]);
                }
            }, 500);
        });
    }

    async function parallelLimit(items, fn, limit) {
        const results = [];
        let idx = 0;
        async function worker() {
            while (idx < items.length) {
                const i = idx++;
                results[i] = await fn(items[i], i);
            }
        }
        const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
        await Promise.all(workers);
        return results;
    }

    async function loadReadinessForRows(rows, sectorValue) {
        LOG.debug('READY', 'пакет строк', { строк: rows.length, сектор: sectorValue });
        await parallelLimit(rows, async (row) => {
            const result = await fetchReadiness(row.productId, sectorValue);
            row._isPacked = result.isPacked;
            row._isPostpressReady = result.isPostpressReady;
            row._materials = result.materials;
            row._products = result.products;
            row._productQty = result.qty || 0;
            row.cells[4] = { text: result.text, html: '', cls: '', alignRight: false };
            row._status = result.status;
            row._isStopped = result.isStopped;

            if (result.title) row.cells[1] = { text: result.title, html: '', cls: '', alignRight: false };
            if (result.tirazh) row.cells[3] = { text: result.tirazh, html: '', cls: row.cells[3] ? row.cells[3].cls : '', alignRight: true };
            row.cells[2] = { text: '', html: result.description || '—', cls: '', alignRight: false };

            updateShfRowDom(row);
        }, 3);
        LOG.debug('READY', 'пакет обработан', sectorValue);
    }

    async function runUnifiedScan() {
        if (unifiedBusy) return;
        unifiedBusy = true;
        const tScan = timer('полный скан');

        setStatus(unifiedEl.left, '⏳ Загрузка 1 / ШФ…');
        setStatus(unifiedEl.right, '⏳ Загрузка 14 / ШФ постпечать…');

        try {
            const [shfLeft, shfRight] = await Promise.all([
                fetchViaIframe(SHF_LEFT.value),
                fetchViaIframe(SHF_RIGHT.value)
            ]);

            cacheShfLeft = shfLeft;
            cacheShfRight = shfRight;

            renderShfColumn(unifiedEl.left, SHF_LEFT.title, shfLeft, SHF_LEFT.value);
            renderShfColumn(unifiedEl.right, SHF_RIGHT.title, shfRight, SHF_RIGHT.value);

            await Promise.all([
                loadReadinessForRows(shfLeft, SHF_LEFT.value),
                loadReadinessForRows(shfRight, SHF_RIGHT.value)
            ]);

            updateDoneStats();
            updateMaterialStats();

            cacheTimestamp = Date.now();
            LOG.info('SCAN', 'списки загружены', { left: shfLeft.length, right: shfRight.length });
            tScan.stop('SCAN');
        } catch (e) {
            LOG.error('SCAN', 'ошибка', e);
        }

        unifiedBusy = false;
    }

    async function refreshReadinessInBackground() {
        if ((cacheShfLeft && cacheShfLeft.length) || (cacheShfRight && cacheShfRight.length)) {
            await Promise.all([
                loadReadinessForRows(cacheShfLeft || [], SHF_LEFT.value),
                loadReadinessForRows(cacheShfRight || [], SHF_RIGHT.value)
            ]);
            updateDoneStats();
            updateMaterialStats();
        }
    }

    async function backgroundRefresh() {
        LOG.info('BG', 'цикл обновления начат');
        const tBg = timer('фоновое обновление');
        const prevIds = new Set([...(cacheShfLeft || []), ...(cacheShfRight || [])].map(r => r.productId));

        try {
            let shfLeft = [], shfRight = [];

            for (let attempt = 0; attempt < 3; attempt++) {
                const results = await Promise.all([
                    fetchViaIframe(SHF_LEFT.value),
                    fetchViaIframe(SHF_RIGHT.value)
                ]);
                shfLeft = results[0]; shfRight = results[1];
                if (shfLeft.length > 0 || shfRight.length > 0) break;
                LOG.warn('BG', `попытка ${attempt + 1}: пусто, повтор`);
                await wait(2000);
            }

            if (shfLeft.length > 0) cacheShfLeft = shfLeft;
            if (shfRight.length > 0) cacheShfRight = shfRight;

            const newIds = [...(shfLeft || []), ...(shfRight || [])].map(r => r.productId);
            LOG.info('BG', 'дельта списков', {
                добавлено: newIds.filter(id => !prevIds.has(id)),
                исчезло: [...prevIds].filter(id => !newIds.includes(id)),
            });

            const allShfRows = [...(cacheShfLeft || []), ...(cacheShfRight || [])];
            if (allShfRows.length > 0) {
                await Promise.all([
                    loadReadinessForRows(cacheShfLeft || [], SHF_LEFT.value),
                    loadReadinessForRows(cacheShfRight || [], SHF_RIGHT.value)
                ]);
                cacheTimestamp = Date.now();
                updateDoneStats();
                updateMaterialStats();
            }

            if (unifiedOpen && unifiedEl) {
                if (cacheShfLeft) renderShfColumn(unifiedEl.left, SHF_LEFT.title, cacheShfLeft, SHF_LEFT.value);
                if (cacheShfRight) renderShfColumn(unifiedEl.right, SHF_RIGHT.title, cacheShfRight, SHF_RIGHT.value);
            }

            LOG.info('BG', 'обновлено', { left: (cacheShfLeft || []).length, right: (cacheShfRight || []).length });
            tBg.stop('BG');
        } catch (e) {
            LOG.error('BG', 'ошибка', e);
        }
    }

    /* ===== СЧЁТЧИК СДЕЛАННЫХ ЗАКАЗОВ ШФ ЗА ДЕНЬ ===== */
    const STATS_KEY = 'tmShfDoneStats';
    // const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

    function loadStats() {
        try { const raw = localStorage.getItem(STATS_KEY); if (raw) return JSON.parse(raw); } catch (e) {}
        return { day: todayStr(), count: 0, counted: [], watched: {} };
    }
    function saveStats(st) { try { localStorage.setItem(STATS_KEY, JSON.stringify(st)); } catch (e) {} }

    let shfStats = loadStats();

function resetStatsIfNewDay() {
        const t = todayStr();
        if (shfStats.day !== t) {
            LOG.info('STATS', 'новый день', { было: shfStats.day, стало: t, архив: shfStats.count });
            if (shfStats.count > 0) {
                if (!materialStats.doneByDay) materialStats.doneByDay = {};
                const prev = normalizeDayEntry(materialStats.doneByDay[shfStats.day]);
                materialStats.doneByDay[shfStats.day] = {
                    count: prev.count + shfStats.count,
                    ids: prev.ids.concat(shfStats.counted.slice()) // номера заказов за день
                };
                saveMaterialStats(materialStats);
            }
            shfStats.day = t;
            shfStats.count = 0;
            shfStats.counted = [];
            saveStats(shfStats);
        }
    }

    /* ===== Вспомогательные даты (восстановить, если удалились со старой статистикой) ===== */
    const todayStr = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    function getWeekStart() {
        const now = new Date();
        const day = now.getDay();                 // 0 = воскресенье
        const diff = (day === 0 ? -6 : 1 - day);  // смещение к понедельнику
        const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
        return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    }

    /* ===== СТАТИСТИКА: ОБЩАЯ БД (GitHub) ===== */
    const STATS_PATH = 'stats.json';
    let statsShared = null;          // актуальное общее состояние в памяти
    let statsSyncTimer = null;
    let statsBusy = false;
    let materialStatsBusy = false;

    function statsEmpty(weekStart) {
        return { weekStart: weekStart, materialsByOrder: {}, productsByOrder: {}, doneByDay: {}, updated: null, pc: null };
    }

    const loadStatsCache = () => { try { const r = localStorage.getItem('tmStatsCache'); return r ? JSON.parse(r) : null; } catch (e) { return null; } };
    const saveStatsCache = s => { try { localStorage.setItem('tmStatsCache', JSON.stringify(s)); } catch (e) {} };

    const statsPendingGet = () => {
        let p = null;
        try { p = JSON.parse(localStorage.getItem('tmStatsPending') || 'null'); } catch (e) {}
        p = (p && typeof p === 'object') ? p : {};
        return { done: p.done || {}, mats: p.mats || {}, prods: p.prods || {} };
    };

    const statsPendingSet = p => {
        const q = (p && typeof p === 'object') ? p : {};
        try {
            localStorage.setItem('tmStatsPending', JSON.stringify({
                done:  q.done  || {},
                mats:  q.mats  || {},
                prods: q.prods || {}
            }));
        } catch (e) {}
    };

    const watchedGet = () => { try { return JSON.parse(localStorage.getItem('tmShfWatched') || '{}'); } catch (e) { return {}; } };
    const watchedSet = w => { try { localStorage.setItem('tmShfWatched', JSON.stringify(w)); } catch (e) {} };

    function statsDoneIdsAll(base) {
        const s = new Set();
        Object.values(base.doneByDay || {}).forEach(d => Object.keys(d.ids || {}).forEach(id => s.add(id)));
        return s;
    }
    
    function statsTodayCount() {
        const b = statsShared || loadStatsCache();
        if (!b) return 0;
        const d = (b.doneByDay || {})[todayStr()];
        return d ? Object.keys(d.ids || {}).length : 0;
    }

    function updateFooter() {
        if (!unifiedEl || !unifiedEl.footerStats) return;

        const parts = [`Сделанные заказы: <b style="color:#2e7d32;">${statsTodayCount()}</b>`];

        const matEntries = Object.entries(statsMaterialsTotals()).filter(([_, c]) => c > 0).sort((a, b) => b[1] - a[1]);
        if (matEntries.length > 0) {
            parts.push('<b>Материалы:</b> ' + matEntries.map(([n, c]) => `${n}: <b>${c}</b>`).join(' &nbsp;|&nbsp; '));
        }
        const prodEntries = Object.entries(statsProductsTotals()).filter(([_, c]) => c > 0).sort((a, b) => b[1] - a[1]);
        if (prodEntries.length > 0) {
            parts.push('<b>Изделия:</b> ' + prodEntries.map(([n, c]) => `${n}: <b>${c}</b>`).join(' &nbsp;|&nbsp; '));
        }
        if (!matEntries.length && !prodEntries.length) {
            parts.push('<span style="color:#999;">Материалы и изделия за неделю: пока нет данных</span>');
        }

        unifiedEl.footerStats.innerHTML = parts.join(' &nbsp;&nbsp;•&nbsp;&nbsp; ');
    }

    function updateFooterCount() { updateFooter(); }

    function statsMaterialsTotals() {
        const out = {};
        const b = statsShared || loadStatsCache();
        Object.values((b || {}).materialsByOrder || {}).forEach(rec => (rec.mats || []).forEach(m => { out[m] = (out[m] || 0) + 1; }));
        return out;
    }

    function statsProductsTotals() {
        const out = {};
        const b = statsShared || loadStatsCache();
        Object.values((b || {}).productsByOrder || {}).forEach(rec => (rec.items || []).forEach(it => { out[it[0]] = (out[it[0]] || 0) + (it[1] || 0); }));
        return out;
    }

    function statsScheduleSync() {
        clearTimeout(statsSyncTimer);
        statsSyncTimer = setTimeout(() => statsSync('пендинг'), 3000);
    }

    async function statsSync(reason) {
        if (!ghToken()) { LOG.warn('SYNC', 'статистика: нет токена'); return; }
        try {
            const remote = await ghRead(STATS_PATH);
            let base = (remote && remote.data && remote.data.weekStart) ? remote.data : statsEmpty(getWeekStart());

            // новая неделя — отчёт из общих данных и сброс
            const curWeek = getWeekStart();
            if (base.weekStart !== curWeek) {
                LOG.info('STATS', 'новая неделя — формирую отчёт', { неделя: base.weekStart });
                exportStatsReport(base);
                base = statsEmpty(curWeek);
            }

            // вливаем локальныеpending-вклады (кто первый записал — того и заказ)
            const pending = statsPendingGet();
            let dirty = false;
            Object.entries(pending.done || {}).forEach(([id, rec]) => {
                if (!statsDoneIdsAll(base).has(id)) {
                    base.doneByDay[rec.day] = base.doneByDay[rec.day] || { ids: {} };
                    base.doneByDay[rec.day].ids[id] = { t: rec.t, pc: rec.pc };
                    dirty = true;
                }
            });
            Object.entries(pending.mats || {}).forEach(([id, rec]) => {
                if (!base.materialsByOrder[id]) { base.materialsByOrder[id] = rec; dirty = true; }
            });
            Object.entries(pending.prods || {}).forEach(([id, rec]) => {
                if (!base.productsByOrder[id]) { base.productsByOrder[id] = rec; dirty = true; }
            });

            statsShared = base;
            saveStatsCache(base);

            if (dirty || !remote) {
                base.updated = new Date().toISOString();
                base.pc = pcName();
                try {
                    await ghWrite(STATS_PATH, base, remote ? remote.sha : undefined);
                } catch (we) {
                    // конфликт sha: перечитали, долили pending, повторили
                    const remote2 = await ghRead(STATS_PATH);
                    const b2 = (remote2 && remote2.data && remote2.data.weekStart) ? remote2.data : base;
                    Object.entries(pending.done || {}).forEach(([id, rec]) => {
                        if (!statsDoneIdsAll(b2).has(id)) { b2.doneByDay[rec.day] = b2.doneByDay[rec.day] || { ids: {} }; b2.doneByDay[rec.day].ids[id] = { t: rec.t, pc: rec.pc }; }
                    });
                    Object.entries(pending.mats || {}).forEach(([id, rec]) => { if (!b2.materialsByOrder[id]) b2.materialsByOrder[id] = rec; });
                    Object.entries(pending.prods || {}).forEach(([id, rec]) => { if (!b2.productsByOrder[id]) b2.productsByOrder[id] = rec; });
                    b2.updated = new Date().toISOString(); b2.pc = pcName();
                    await ghWrite(STATS_PATH, b2, remote2 ? remote2.sha : undefined);
                    statsShared = b2; saveStatsCache(b2);
                }
                statsPendingSet({});
            } else {
                statsPendingSet({});   // наши pending уже есть в удалённой базе
            }

            updateFooter();
            LOG.info('SYNC', 'статистика синхронизирована', { причина: reason, запись: dirty || !remote });
        } catch (e) {
            LOG.warn('SYNC', 'статистика: сбой синхронизации, работаем локально', e && e.message);
            if (!statsShared) { statsShared = loadStatsCache(); updateFooter(); }
        }
    }

    async function fetchPackStatus(productId) {
        try {
            const doc = await loadFormDoc(productId, 12000);
            if (!doc) return false;
            return detectStatuses(doc).isPacked;
        } catch (e) { return false; }
    }

    /* --- сбор вкладов: сделанные заказы --- */
    async function updateDoneStats() {
        if (statsBusy) return;
        statsBusy = true;
        try {
            const base = statsShared || loadStatsCache() || statsEmpty(getWeekStart());
            const known = statsDoneIdsAll(base);
            const pending = statsPendingGet();
            const watched = watchedGet();
            const t = todayStr();

            const seen = new Set(); const currentRows = [];
            [...(cacheShfLeft || []), ...(cacheShfRight || [])].forEach(r => { if (!seen.has(r.productId)) { seen.add(r.productId); currentRows.push(r); } });

            currentRows.forEach(r => { watched[r.productId] = watched[r.productId] || t; });

            let added = 0;
            const addDone = (id) => {
                if (known.has(id) || pending.done[id]) return;
                pending.done[id] = { day: t, t: Date.now(), pc: pcName() };
                added++;
                LOG.info('STATS', 'сделанный заказ (pending)', { id });
            };

            currentRows.forEach(r => { if (r._isPacked) addDone(r.productId); });

            const currentIds = new Set(currentRows.map(r => r.productId));
            const missing = Object.keys(watched).filter(id => !currentIds.has(id) && !known.has(id) && !pending.done[id]).slice(0, 30);
            if (missing.length) {
                const flags = await parallelLimit(missing, id => fetchPackStatus(id), 5);
                missing.forEach((id, i) => { if (flags[i]) addDone(id); });
            }

            const weekAgo = Date.now() - 7 * 86400000;
            Object.keys(watched).forEach(id => { if (new Date(watched[id] + 'T00:00:00').getTime() < weekAgo) delete watched[id]; });
            watchedSet(watched);

            statsPendingSet(pending);
            if (added) statsScheduleSync();
        } catch (e) {
            LOG.error('STATS', 'ошибка updateDoneStats', e);
        } finally {
            statsBusy = false;
        }
    }

    /* --- сбор вкладов: материалы и изделия --- */
    async function updateMaterialStats() {
        if (materialStatsBusy) return;
        materialStatsBusy = true;
        try {
            const base = statsShared || loadStatsCache() || statsEmpty(getWeekStart());
            const pending = statsPendingGet();

            const seen = new Set(); const currentRows = [];
            [...(cacheShfLeft || []), ...(cacheShfRight || [])].forEach(r => { if (!seen.has(r.productId)) { seen.add(r.productId); currentRows.push(r); } });

            let added = 0;
            currentRows.forEach(r => {
                if (r._materials && r._materials.length && !base.materialsByOrder[r.productId] && !pending.mats[r.productId]) {
                    pending.mats[r.productId] = { mats: r._materials, t: Date.now(), pc: pcName() };
                    added++;
                    LOG.info('STATS', 'материалы (pending)', { id: r.productId, материалы: r._materials });
                }
                if (r._products && r._products.length && !base.productsByOrder[r.productId] && !pending.prods[r.productId]) {
                    const qty = (r._productQty > 0) ? r._productQty : 1;
                    pending.prods[r.productId] = { items: r._products.map(p => [p, qty]), t: Date.now(), pc: pcName() };
                    added++;
                    LOG.info('STATS', 'изделия (pending)', { id: r.productId, изделия: r._products, количество: qty });
                }
            });

            statsPendingSet(pending);
            if (added) statsScheduleSync();
        } catch (e) {
            LOG.error('STATS', 'ошибка updateMaterialStats', e);
        } finally {
            materialStatsBusy = false;
        }
    }

    /* --- отчёт из общей базы --- */
    function buildStatsReportText(st) {
        const weekEnd = getWeekEndIso(st.weekStart);
        const matsTot = {}; Object.values(st.materialsByOrder || {}).forEach(rec => (rec.mats || []).forEach(m => { matsTot[m] = (matsTot[m] || 0) + 1; }));
        const prodsTot = {}; Object.values(st.productsByOrder || {}).forEach(rec => (rec.items || []).forEach(it => { prodsTot[it[0]] = (prodsTot[it[0]] || 0) + (it[1] || 0); }));

        const lines = [];
        lines.push('========================================');
        lines.push('LaserHall — отчёт по участку ШФ');
        lines.push(`Неделя: ${formatDateRu(st.weekStart)} – ${formatDateRu(weekEnd)}`);
        lines.push(`Отчёт сформирован: ${new Date().toLocaleString('ru-RU')}`);
        lines.push('========================================');
        lines.push('');
        lines.push('МАТЕРИАЛЫ:');
        const mats = Object.entries(matsTot).filter(([_, c]) => c > 0).sort((a, b) => b[1] - a[1]);
        if (mats.length) mats.forEach(([n, c]) => lines.push(`  ${n}: ${c}`));
        else lines.push('  (нет данных)');
        lines.push('');
        lines.push('ИЗДЕЛИЯ:');
        const prods = Object.entries(prodsTot).filter(([_, c]) => c > 0).sort((a, b) => b[1] - a[1]);
        if (prods.length) prods.forEach(([n, c]) => lines.push(`  ${n}: ${c}`));
        else lines.push('  (нет данных)');
        lines.push('');
        lines.push('СДЕЛАННЫЕ ЗАКАЗЫ ПО ДНЯМ:');
        const days = Object.entries(st.doneByDay || {}).sort((a, b) => a[0].localeCompare(b[0]));
        let total = 0;
        if (days.length) days.forEach(([d, rec]) => {
            const ids = Object.keys(rec.ids || {});
            total += ids.length;
            lines.push(`  ${formatDateRu(d)} - Сделанные заказы: ${ids.length}${ids.length ? ' (' + ids.join(', ') + ')' : ''}`);
        });
        else lines.push('  (нет данных)');
        lines.push(`  ИТОГО за неделю: ${total}`);
        lines.push('========================================');
        return lines.join('\n');
    }

    function exportStatsReport(st) {
        const has = Object.keys(st.materialsByOrder || {}).length || Object.keys(st.productsByOrder || {}).length || Object.keys(st.doneByDay || {}).length;
        if (!has) { LOG.warn('REPORT', 'нет данных для отчёта'); return false; }
        const filename = `SHF_otchet_${st.weekStart}_${getWeekEndIso(st.weekStart)}.txt`;
        downloadReport(buildStatsReportText(st), filename);
        return true;
    }

    window.tmStats = () => ({ общая: statsShared, pending: statsPendingGet() });
    window.tmExportLegacy = () => {
        try {
            const raw = localStorage.getItem('tmShfMaterialsStats');
            if (!raw) { alert('Старой локальной статистики нет'); return; }
            downloadReport(buildReportText(JSON.parse(raw)), `SHF_otchet_legacy_${todayStr()}.txt`);
        } catch (e) { alert('Ошибка: ' + e.message); }
    };

    /* ===== СТАРТ ===== */

    setTimeout(() => { statsSync('старт'); }, 8000);
    setInterval(() => { statsSync('поллинг'); }, 90000);

    setInterval(() => { if (stockOpen) stockSync('поллинг'); }, 60000);

    setInterval(() => {
        if (built) {
            if (menuContainer && !document.body.contains(menuContainer)) { built = false; menuContainer = null; }
            if (!document.querySelector('.tm-order-field')) built = false;
        }
        buildMenu();
    }, 600);

    buildMenu();

    setTimeout(() => { if (!document.querySelector('.tm-time-tracking')) makeFallbackButton(); }, 10000);
    setTimeout(() => { backgroundRefresh(); }, 5000);
    setInterval(() => { backgroundRefresh(); }, AUTO_REFRESH_INTERVAL);

    LOG.info('INIT', 'скрипт запущен', { url: location.href, интервал: AUTO_REFRESH_INTERVAL });

})();
