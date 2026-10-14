// Écran de chargement commun aux pages e-commerce.
// L'animation existante est affichée uniquement pendant le chargement réel de la page.
(function initNtPageLoader() {
    const showLoader = () => {
        if (document.getElementById('nt-page-loader')) return;

        const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        // L'accueil utilise le même indicateur discret que les autres pages.
        // Le GIF plein écran n'est plus affiché au rechargement.
        const isHomePage = false;
        const loader = document.createElement('div');
        loader.id = 'nt-page-loader';
        loader.className = `nt-page-loader ${isHomePage ? 'nt-page-loader--home' : 'nt-page-loader--compact'}`;
        loader.setAttribute('role', 'status');
        loader.setAttribute('aria-label', 'Chargement de New Technologies');
        loader.innerHTML = `
            <img class="nt-page-loader__visual" src="${prefersReducedMotion ? '/static/img/logo/LOGO-NT.png' : '/static/img/logo/turn.gif'}" alt="" aria-hidden="true">
            <span class="sr-only">Chargement en cours…</span>
        `;

        const style = document.createElement('style');
        style.id = 'nt-page-loader-style';
        style.textContent = `
            .nt-page-loader { align-items:center; background:#000; display:flex; inset:0; justify-content:center; opacity:1; overflow:hidden; pointer-events:none; position:fixed; transition:opacity .38s ease, visibility 0s linear .38s; visibility:visible; z-index:2147483647; }
            .nt-page-loader__visual { display:block; height:100%; max-width:none; object-fit:cover; width:100%; }
            .nt-page-loader--home { background:rgba(0,0,0,.88); backdrop-filter:blur(3px); }
            .nt-page-loader--home .nt-page-loader__visual { height:auto; max-height:min(78vh,720px); max-width:min(92vw,1280px); object-fit:contain; width:auto; }
            .nt-page-loader--compact { background:transparent; border-radius:50%; bottom:24px; box-shadow:0 10px 28px rgba(0,0,0,.28); height:92px; inset:auto auto 24px 50%; pointer-events:none; transform:translateX(-50%); width:92px; }
            .nt-page-loader--compact .nt-page-loader__visual { height:100%; object-fit:cover; width:100%; }
            .nt-page-loader.is-leaving { opacity:0; pointer-events:none; visibility:hidden; }
            @media (max-width:575.98px) { .nt-page-loader--home .nt-page-loader__visual { max-height:52vh; max-width:90vw; } .nt-page-loader--compact { bottom:16px; height:76px; width:76px; } }
            @media (prefers-reduced-motion: reduce) { .nt-page-loader { transition:none; } .nt-page-loader--home .nt-page-loader__visual { height:auto; max-height:150px; max-width:72vw; object-fit:contain; width:auto; } .nt-page-loader--compact .nt-page-loader__visual { object-fit:contain; } }
        `;
        document.head.appendChild(style);
        document.body.appendChild(loader);
        // Une fois le loader de l'accueil visible, le voile translucide peut
        // laisser apparaître délicatement la page en arrière-plan.
        if (isHomePage) window.__ntPageLoaderBoot?.reveal?.();

        const startedAt = Date.now();
        let hidden = false;
        const hideLoader = () => {
            if (hidden) return;
            hidden = true;
            const elapsed = Date.now() - startedAt;
            const minimumDisplayTime = isHomePage ? 700 : 0;
            const wait = Math.max(0, minimumDisplayTime - elapsed);
            window.setTimeout(() => {
                // Le bootstrap exécuté dans le <head> peut maintenant révéler
                // la page, sous le fondu du loader : aucun flash de contenu.
                window.__ntPageLoaderBoot?.reveal?.();
                loader.classList.add('is-leaving');
                window.setTimeout(() => {
                    loader.remove();
                    style.remove();
                }, 420);
            }, wait);
        };

        if (document.readyState === 'complete') {
            hideLoader();
        } else {
            window.addEventListener('load', hideLoader, { once: true });
            // Les pages secondaires restent couvertes jusqu'au chargement
            // complet. Cette valeur ne sert que si une ressource est bloquée.
            window.setTimeout(hideLoader, isHomePage ? 10000 : 45000);
        }
    };

    if (document.body) showLoader();
    else document.addEventListener('DOMContentLoaded', showLoader, { once: true });
})();

async function loadComponentByClass(className, file, callback = null) {
    try {
        const response = await fetch(file);
        const content = await response.text();

        document.querySelectorAll(`.${className}`).forEach(el => {
            el.innerHTML = content;
            
            // Déclencher événement pour la recherche
            if (className === 'search-container') {
                console.log("🔍 Conteneur de recherche chargé");
                document.dispatchEvent(new CustomEvent('searchContainerLoaded'));
            }

            if (className === 'nav-container') {
                document.dispatchEvent(new CustomEvent('navContainerLoaded'));
                if (typeof checkLoggedInUser === 'function') {
                    checkLoggedInUser();
                }
            }

            if (className === 'auth-container') {
                document.dispatchEvent(new CustomEvent('authContainerLoaded'));
            }
            
            // Déclencher événement pour le menu mobile
            if (className === 'mobile-menu-container') {
                document.dispatchEvent(new CustomEvent('mobileMenuLoaded'));
            }
        });

        if (typeof callback === "function") {
            callback();
        }

        if (className === "footer-container") {
            document.dispatchEvent(new CustomEvent("footerLoaded"));
        }
    } catch (error) {
        console.error(`Erreur lors du chargement de ${file} :`, error);
    }
}

async function loadCartNav() {
    if (typeof window.refreshCartBadge === "function") {
        return window.refreshCartBadge();
    }

    try {
        const res = await fetch(`${API}/cart/`, {
            method: "GET",
            credentials: "include"
        });
        if (!res.ok) throw new Error("Erreur chargement panier");
        const cart = await res.json();
        updateCartNav(cart);
    } catch (err) {
        console.error("[loadCartNav] Erreur:", err);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadComponentByClass("nav-container", "/nav", reInitUI);
    await loadComponentByClass("auth-container", "/auth", reInitUI);

    await loadComponentByClass("search-container", "/search", reInitUI);
    await loadComponentByClass("mobile-menu-container", "/mobile-menu", reInitUI);
    if (typeof window.refreshNavigationBadges === "function") {
        await window.refreshNavigationBadges();
    } else {
        await loadCartNav();
    }

    await loadComponentByClass("footer-container", "/footer");
});

