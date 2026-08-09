document.querySelectorAll(".u-header__sub-menu-nav-link").forEach(link => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        const catId = link.dataset.id;
        window.location.href = `/category-product?id=${catId}`;
    });
});

async function initCategoryNavigation() {
    try {
        // 1. Récupérer toutes les catégories
        const res = await fetch(`${API}/categories`);
        if (!res.ok) throw new Error("Erreur récupération catégories");
        const categories = await res.json();

        // 2. Construire la map slug → id
        const categoryMap = {};
        categories.forEach(cat => {
        categoryMap[cat.slug] = cat.id;
        });

        // 3. Cibler tous les menus UL qui doivent contenir les catégories
        const menus = document.querySelectorAll(".u-header__sub-menu-nav-group");

        menus.forEach(menu => {
        // 4. Générer les liens dynamiquement
        let linksHtml = categories.map(cat => `
            <li>
            <a class="nav-link u-header__sub-menu-nav-link" 
                href="/categories/${cat.slug}" 
                data-id="${cat.id}">
                ${cat.name}
            </a>
            </li>
        `).join("");

        // 5. Ajouter le lien "Tous les produits" en bas
        linksHtml += `
            <li>
            <a class="nav-link u-header__sub-menu-nav-link u-nav-divider border-top pt-2 flex-column align-items-start" href="/shop">
                <div class="">Tous les produits</div>
                <div class="u-nav-subtext font-size-11 text-gray-30">Découvrir plus de produits</div>
            </a>
            </li>
        `;

        menu.innerHTML = linksHtml;

        // 6. Intercepter les clics pour rediriger vers /category-product?id=${id}
        menu.querySelectorAll("a[data-id]").forEach(link => {
            link.addEventListener("click", (e) => {
            e.preventDefault();
            const catId = link.dataset.id;
            window.location.href = `/category-product?id=${catId}`;
            });
        });
        });

    } catch (err) {
        console.error("Erreur navigation catégories:", err);
    }
}

// Appeler la fonction au chargement
document.addEventListener("DOMContentLoaded", initCategoryNavigation);