// ==UserScript==
// @name         Laserhall Axiom Loader
// @namespace    https://laserhall.simprint.pro/
// @version      1.3.0
// @description  Тянет актуальную версию скрипта Laserhall Axiom (raw → jsDelivr → api GitHub).
// @match        https://laserhall.simprint.pro/axiom/index_postpress.php
// @require      https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const OWNER  = 'ВАШ_ЛОГИН';
    const REPO   = 'laserhall-axiom';
    const FILE   = 'laserhall-axiom.user.js';
    const BRANCH = 'main';

    // Порядок важен: raw не имеет лимита 60/час; api.github.com имеет (общий на весь офисный IP)
    const SOURCES = [
        { name: 'raw GitHub', url: `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${FILE}` },
        { name: 'jsDelivr',   url: `https://cdn.jsdelivr.net/gh/${OWNER}/${REPO}@${BRANCH}/${FILE}` },
        { name: 'api GitHub', url: `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}?ref=${BRANCH}`, headers: { 'Accept': 'application/vnd.github.raw+json' } },
    ];

    const CACHE_KEY = 'tmLoaderCache';
    const ver = code => (code.match(/@version\s+([^\s]+)/) || [null, '?'])[1];

    function run(code, source) {
        const v = ver(code);
        try { localStorage.setItem(CACHE_KEY, code); } catch (e) {}
        try { window.tmLoadedVersion = v; } catch (e) {}
        console.info(`[TM loader] запускаю v${v} из источника: ${source}`);
        try { (0, eval)(code); } catch (e) { console.error('[TM loader] ошибка выполнения:', e); }
    }

    function grab(src) {
        return fetch(src.url + (src.url.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store', headers: src.headers || {} })
            .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
            .then(code => ({ code, name: src.name }));
    }

    SOURCES.reduce((chain, src) =>
        chain.catch(err => {
            console.warn(`[TM loader] источник «${src.name}» недоступен:`, (err && err.message) || err);
            return grab(src);
        }),
        Promise.reject(new Error('старт'))
    )
    .then(({ code, name }) => run(code, name))
    .catch(e => {
        console.warn('[TM loader] все источники недоступны, беру копию из кэша:', e);
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) run(cached, 'кэша localStorage');
            else console.error('[TM loader] кэша нет — скрипт НЕ запущен');
        } catch (e2) {}
    });
})();
