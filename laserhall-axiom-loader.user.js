// ==UserScript==
// @name         Laserhall Axiom Loader
// @namespace    https://laserhall.simprint.pro/
// @version      1.1.0
// @description  Тянет актуальную версию скрипта Laserhall Axiom с GitHub при каждой загрузке страницы.
// @match        https://laserhall.simprint.pro/axiom/index_postpress.php
// @require      https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const OWNER  = 'Lolomyn';
    const REPO   = 'laserhall-axiom';
    const FILE   = 'laserhall-axiom.user.js';
    const BRANCH = 'main';

    const SRC_API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}?ref=${BRANCH}`;
    const SRC_RAW = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${FILE}`;

    const CACHE_KEY = 'tmLoaderCache';
    const ver = code => (code.match(/@version\s+([^\s]+)/) || [null, '?'])[1];

    function run(code, source) {
        try { localStorage.setItem(CACHE_KEY, code); } catch (e) {}
        console.info(`[TM loader] запускаю v${ver(code)} из ${source}`);
        try { (0, eval)(code); } catch (e) { console.error('[TM loader] ошибка выполнения:', e); }
    }

    function grab(url, opts) {
        return fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(), Object.assign({ cache: 'no-store' }, opts))
            .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); });
    }

    grab(SRC_API, { headers: { 'Accept': 'application/vnd.github.raw+json' } })
        .catch(e => { console.warn('[TM loader] API недоступен, пробую raw:', e); return grab(SRC_RAW); })
        .then(code => run(code, 'сети'))
        .catch(e => {
            console.warn('[TM loader] сеть недоступна, беру копию из кэша:', e);
            try {
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) run(cached, 'кэша localStorage');
                else console.error('[TM loader] кэша нет — скрипт НЕ запущен');
            } catch (e2) {}
        });
})();
