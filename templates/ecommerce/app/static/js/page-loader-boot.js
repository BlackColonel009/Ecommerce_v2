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
            html.nt-page-loading { background: #000; }
            html.nt-page-loading body > * { visibility: hidden !important; }
            html.nt-page-loading body > #nt-page-loader { visibility: visible !important; }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    let revealed = false;
    const reveal = () => {
        if (revealed) return;
        revealed = true;
        root.classList.remove('nt-page-loading');
        style.remove();
        window.clearTimeout(safetyTimer);
    };

    // Évite de laisser une page cachée si un script tiers échoue.
    // Même filet de sécurité que le loader : on privilégie le chargement
    // complet plutôt qu'une révélation prématurée sur réseau lent.
    const safetyTimer = window.setTimeout(reveal, 45000);
    window.__ntPageLoaderBoot = { reveal };

    // Le bootstrap ne dépend pas du script de navigation : dès que le
    // navigateur a fini de charger la page, il rend les interactions.
    window.addEventListener('load', reveal, { once: true });
})();
