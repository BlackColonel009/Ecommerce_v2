/*
 * Démarre avant le rendu de la page. Ainsi, sur une connexion lente, le
 * contenu ne peut pas apparaître brièvement avant l'écran de chargement.
 */
(function bootstrapNtPageLoader() {
    const root = document.documentElement;
    if (window.__ntPageLoaderBoot) return;

    root.classList.add('nt-page-loading');

    let style = document.getElementById('nt-page-loader-boot-style');
    if (!style) {
        style = document.createElement('style');
        style.id = 'nt-page-loader-boot-style';
        style.textContent = `
            html { background: #fff; }
            html::before { background:transparent url('/static/img/logo/turn.gif') center/contain no-repeat; bottom:24px; content:''; height:92px; left:50%; opacity:0; pointer-events:none; position:fixed; transform:translateX(-50%); transition:opacity .42s ease; width:92px; z-index:2147483647; }
            html.nt-page-loading::before { opacity:1; }
            html body > *:not(#nt-page-loader) { transition:opacity .42s ease; }
            html.nt-page-loading body > *:not(#nt-page-loader) { opacity:0 !important; visibility:hidden !important; }
            html.nt-page-loading body > #nt-page-loader { opacity:1 !important; visibility:visible !important; }
            @media (max-width:575.98px) { html::before { bottom:16px; height:76px; width:76px; } }
            @media (prefers-reduced-motion:reduce) { html::before, html body > *:not(#nt-page-loader) { transition:none; } }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    let revealed = false;
    const reveal = () => {
        if (revealed) return;
        revealed = true;
        root.classList.remove('nt-page-loading');
        // Conserve les règles de transition le temps du fondu d'entrée.
        window.setTimeout(() => style.remove(), 440);
        window.clearTimeout(safetyTimer);
    };

    // Évite de laisser une page cachée si un script tiers échoue.
    // Même filet de sécurité que le loader : on privilégie le chargement
    // complet plutôt qu'une révélation prématurée sur réseau lent.
    const safetyTimer = window.setTimeout(reveal, 45000);
    window.__ntPageLoaderBoot = { reveal };

    // Le script de navigation appelle reveal après avoir installé puis retiré
    // son indicateur. Le filet de sécurité ci-dessus couvre un script rompu.
})();
