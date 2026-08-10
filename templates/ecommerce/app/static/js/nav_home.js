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

