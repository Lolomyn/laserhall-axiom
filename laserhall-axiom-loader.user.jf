// ==UserScript==
// @name         Laserhall Axiom Loader
// @namespace    https://laserhall.simprint.pro/
// @version      1.0.0
// @description  Тянет актуальную версию скрипта Laserhall Axiom с GitHub при каждой загрузке страницы.
// @match        https://laserhall.simprint.pro/axiom/index_postpress.php
// @require      https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const SRC = 'https://raw.githubusercontent.com/ВАШ_ЛОГИН/laserhall-axiom/main/laserhall-axiom.user.js';
    const CACHE_KEY = 'tmLoaderCache';

    function run(code) {
        try { localStorage.setItem(CACHE_KEY, code); } catch (e) {}
        try {
            (0, eval)(code);
        } catch (e) {
            console.error('[TM loader] ошибка выполнения:', e);
        }
    }

    fetch(SRC + (SRC.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store' })
        .then(r => {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.text();
        })
        .then(run)
        .catch(e => {
            console.warn('[TM loader] GitHub недоступен, беру копию из кэша:', e);
            try {
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) run(cached);
            } catch (e2) {}
        });
})();
