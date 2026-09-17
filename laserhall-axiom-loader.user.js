// ==UserScript==
// @name         Laserhall Axiom Loader
// @namespace    https://laserhall.simprint.pro/
// @version      1.5.0
// @description  Laserhall Axiom: свежая версия через GitHub API с токеном (5000 зап/час) + резервные источники.
// @match        https://laserhall.simprint.pro/axiom/index_postpress.php
// @require      https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';
    if (window.self !== window.top) return;   // не работаем в скрытых iframe

    const OWNER  = 'Lolomyn';
    const REPO   = 'laserhall-axiom';
    const FILE   = 'laserhall-axiom.user.js';
    const BRANCH = 'main';

    // ⬇️ ВСТАВЬТЕ СЮДА СВОЙ ТОКЕН (копия хранится только локально в Tampermonkey)
    const TOKEN = 'ghp_ВСТАВЬТЕ_ТОКЕН';

    const SOURCES = [
        {
            name: 'api GitHub (токен)',
            url: `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}?ref=${BRANCH}`,
            headers: {
                'Accept': 'application/vnd.github.raw+json',
                'Authorization': `Bearer ${TOKEN}`
            }
        },
        { name: 'raw GitHub', url: `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${FILE}` },
        { name: 'jsDelivr',   url: `https://cdn.jsdelivr.net/gh/${OWNER}/${REPO}@${BRANCH}/${FILE}` },
    ];

    const CACHE_KEY = 'tmLoaderCache';
    const LASTOK_KEY = 'tmLoaderLastOk';
    const CHECK_TTL = 60 * 1000;   // не дёргать сеть чаще раза в 60 сек
    const ver = code => (code.match(/@version\s+([^\s]+)/) || [null, '?'])[1];

    window.tmForceUpdate = () => {
        try { localStorage.removeItem(LASTOK_KEY); } catch (e) {}
        location.reload();
    };

    function run(code, source) {
        const v = ver(code);
        try { localStorage.setItem(CACHE_KEY, code); localStorage.setItem(LASTOK_KEY, String(Date.now())); } catch (e) {}
        try { window.tmLoadedVersion = v; } catch (e) {}
        try { window.tmGithubToken = TOKEN; } catch (e) {}   // ← добавить: токен для общей БД
        console.info(`[TM loader] запускаю v${v} из источника: ${source}`);
        try { (0, eval)(code); } catch (e) { console.error('[TM loader] ошибка выполнения:', e); }
    }

    function runCached(reason) {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) { run(cached, reason); return true; }
        } catch (e) {}
        console.error('[TM loader] кэша нет — скрипт НЕ запущен');
        return false;
    }

    try {
        const lastOk = parseInt(localStorage.getItem(LASTOK_KEY) || '0', 10);
        if (Date.now() - lastOk < CHECK_TTL) {
            if (runCached('кэша localStorage (TTL)')) return;
        }
    } catch (e) {}

    function grab(src) {
        return fetch(src.url + (src.url.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store', headers: src.headers || {} })
            .then(r => {
                const rem = r.headers.get('x-ratelimit-remaining');
                if (rem !== null) console.info('[TM loader] остаток запросов API:', rem);
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.text();
            })
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
        runCached('кэша localStorage');
    });
})();
