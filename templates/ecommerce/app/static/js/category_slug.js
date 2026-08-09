/* ================================
   VARIABLES GLOBALES
================================ */

window.currentPage = 1;
window.currentLimit = 20;
window.currentSort = "default";
window.currentFilters = {
    brands: [],
    colors: [],
    minPrice: 0,
    maxPrice: 999999
};
window.currentView = "grid";
window.lastProducts = [];


/* ================================
   UTILITAIRE SLUG ROBUSTE
================================ */

function getCategorySlugs() {
    const urlParams = new URLSearchParams(window.location.search);
    const slugParam = urlParams.get("slug");
    return slugParam ? slugParam.split(",") : [];
}


/* ================================
   INITIALISATION AU LOAD
================================ */

document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Initialisation page catégorie...");
    
    // Initialiser avec les valeurs par défaut
    loadProductsByCategoryBySlug(
        window.currentPage, 
        window.currentLimit, 
        window.currentSort, 
        window.currentFilters
    );

    initFiltersButton();
    initSort();
    initViewToggle();
    loadLatestProducts();

});


/* ================================
   LOAD PRODUITS PAR SLUG (AVEC FILTRES)
================================ */

async function loadProductsByCategoryBySlug(page = 1, limit = 20, sort = "default", filters = {}) {
    try {
        console.log("📊 Chargement avec:", { page, limit, sort, filters });
        
        const slug = getCategorySlugs();
        if (!slug || slug.length === 0) {
            console.error("❌ Slug catégorie introuvable");
            return;
        }

        // Construction des paramètres
        const params = new URLSearchParams({ 
            page: page.toString(), 
            limit: limit.toString(), 
            sort 
        });

        // Ajout des filtres
        if (filters.brands && filters.brands.length > 0) {
            params.append("brands", filters.brands.join(","));
        }
        if (filters.colors && filters.colors.length > 0) {
            params.append("colors", filters.colors.join(","));
        }
        if (filters.minPrice !== undefined && filters.minPrice > 0) {
            params.append("minPrice", filters.minPrice.toString());
        }
        if (filters.maxPrice !== undefined && filters.maxPrice < 999999) {
            params.append("maxPrice", filters.maxPrice.toString());
        }

        const url = `${API}/categories/cat_in_cat/${slug}?${params.toString()}`;
        console.log("📡 URL appelée:", url);
        
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Erreur HTTP: ${res.status}`);
        
        const data = await res.json();
        console.log("📦 Données reçues:", data);

        // ✅ EXTRAIRE LES OPTIONS DE FILTRES DES PRODUITS
        const products = data.products || [];
        const total = data.total || 0;
        const currentPage = data.page || page;

        // Analyser les produits pour générer les filtres
        const brandMap = new Map();
        const colorMap = new Map();
        let minPrice = Infinity;
        let maxPrice = -Infinity;

        products.forEach(p => {
            // Marques
            if (p.brand && p.brand.name) {
                const brandName = p.brand.name;
                brandMap.set(brandName, (brandMap.get(brandName) || 0) + 1);
            }

            // Couleurs
            if (p.colors && p.colors.length > 0) {
                p.colors.forEach(c => {
                    colorMap.set(c.color, (colorMap.get(c.color) || 0) + 1);
                });
            }

            // Prix
            if (p.prices && p.prices[0]) {
                const price = p.prices[0].price;
                minPrice = Math.min(minPrice, price);
                maxPrice = Math.max(maxPrice, price);
            }
        });

        // Afficher les filtres
        renderFilters(brandMap, colorMap, minPrice, maxPrice);

        // Mise à jour des variables globales
        window.lastProducts = products;
        window.currentPage = currentPage;
        window.currentLimit = limit;
        window.currentSort = sort;
        window.currentFilters = filters;

        // Mise à jour de l'interface
        updateCategoryTitle(data.categories?.[0]?.name);
        updateResultsCounter(products.length, total);
        renderProducts(products);
        updatePagination(total, currentPage, limit, sort, filters);

    } catch (err) {
        console.error("❌ Erreur chargement catégorie:", err);
        const container = document.querySelector(".shop-product");
        if (container) {
            container.innerHTML = `<p class="text-center text-danger">Erreur de chargement des produits</p>`;
        }
    }
}

/* ================================
   AFFICHER LES FILTRES
================================ */

function renderFilters(brandMap, colorMap, minPrice, maxPrice) {
    // Marques
    const brandContainer = document.getElementById("brandFilters");
    if (brandContainer) {
        if (brandMap.size === 0) {
            brandContainer.innerHTML = '<p class="text-muted small">Aucune marque disponible</p>';
        } else {
            brandContainer.innerHTML = Array.from(brandMap.entries())
                .sort()
                .map(([name, count]) => `
                    <div class="form-group d-flex align-items-center justify-content-between mb-2 pb-1">
                        <div class="custom-control custom-checkbox">
                            <input type="checkbox" class="custom-control-input brand-filter" 
                                   id="brand-${name}" value="${name}">
                            <label class="custom-control-label" for="brand-${name}">
                                ${name} <span class="text-gray-25 font-size-12">(${count})</span>
                            </label>
                        </div>
                    </div>
                `).join('');
        }
    }

    // Couleurs
    const colorContainer = document.getElementById("colorFilters");
    if (colorContainer) {
        if (colorMap.size === 0) {
            colorContainer.innerHTML = '<p class="text-muted small">Aucune couleur disponible</p>';
        } else {
            colorContainer.innerHTML = Array.from(colorMap.entries())
                .sort()
                .map(([color, count]) => `
                    <div class="form-group d-flex align-items-center justify-content-between mb-2 pb-1">
                        <div class="custom-control custom-checkbox">
                            <input type="checkbox" class="custom-control-input color-filter" 
                                   id="color-${color}" value="${color}">
                            <label class="custom-control-label" for="color-${color}">
                                ${color} <span class="text-gray-25 font-size-12">(${count})</span>
                            </label>
                        </div>
                    </div>
                `).join('');
        }
    }

    // Prix
    if (minPrice !== Infinity && maxPrice !== -Infinity) {
        document.getElementById("rangeSliderExample3MinResult").textContent = minPrice;
        document.getElementById("rangeSliderExample3MaxResult").textContent = maxPrice;
        
        // Initialiser le slider
        initPriceSlider(minPrice, maxPrice);
    }
}

/* ================================
   SLIDER DE PRIX
================================ */

function initPriceSlider(min, max) {
    const slider = document.querySelector('.js-range-slider');
    if (!slider || !window.$ || !$.fn.ionRangeSlider) return;

    const existingSlider = $(slider).data("ionRangeSlider");
    if (existingSlider) existingSlider.destroy();

    const rawMin = Number(min) || 0;
    const rawMax = Number(max) || 0;
    const sliderMin = rawMin === rawMax ? 0 : rawMin;
    const sliderMax = Math.max(rawMax, rawMin, 1000);

    const updatePriceLabels = data => {
        const formatter = new Intl.NumberFormat("fr-FR");
        const minEl = document.getElementById("rangeSliderExample3MinResult");
        const maxEl = document.getElementById("rangeSliderExample3MaxResult");
        if (minEl) {
            minEl.dataset.value = String(data.from);
            minEl.textContent = `${formatter.format(data.from)} XOF`;
        }
        if (maxEl) {
            maxEl.dataset.value = String(data.to);
            maxEl.textContent = `${formatter.format(data.to)} XOF`;
        }
    };

    $(slider).ionRangeSlider({
        type: "double",
        min: sliderMin,
        max: sliderMax,
        from: sliderMin,
        to: sliderMax,
        grid: false,
        hide_min_max: true,
        hide_from_to: true,
        onStart: updatePriceLabels,
        onChange: updatePriceLabels,
        onFinish: updatePriceLabels
    });
}


/* ================================
   TITRE DYNAMIQUE
================================ */

function updateCategoryTitle(name) {
    if (!name) return;

    const titleEl = document.getElementById("category-title");
    if (titleEl) titleEl.textContent = name;

    document.title = name + " | Ma Boutique";
}


/* ================================
   COMPTEUR DE RÉSULTATS
================================ */

function updateResultsCounter(shown, total) {
    const counterEl = document.getElementById("results-counter");
    if (counterEl) {
        const start = ((window.currentPage - 1) * window.currentLimit) + 1;
        const end = Math.min(start + shown - 1, total);
        counterEl.textContent = `Affichage ${start}–${end} sur ${total} résultats`;
    }
}


/* ================================
   PAGINATION (CORRIGÉE)
================================ */

function updatePagination(total, currentPage, currentLimit, sort, filters) {
    // ✅ METTRE À JOUR LE COMPTEUR DU BAS
    const bottomCounter = document.getElementById("pagination-counter");
    if (bottomCounter) {
        const start = ((currentPage - 1) * currentLimit) + 1;
        const end = Math.min(start + currentLimit - 1, total);
        bottomCounter.textContent = `Affichage ${start}–${end} sur ${total} résultats`;
    }

    const pagination = document.getElementById("pagination");
    if (!pagination) return;

    pagination.innerHTML = "";

    const totalPages = Math.ceil(total / currentLimit);
    if (totalPages <= 1) return;

    // Bouton précédent
    if (currentPage > 1) {
        const prevLi = document.createElement("li");
        prevLi.classList.add("page-item");
        prevLi.innerHTML = `<a class="page-link" href="#">«</a>`;
        prevLi.querySelector("a").addEventListener("click", e => {
            e.preventDefault();
            loadProductsByCategoryBySlug(currentPage - 1, currentLimit, sort, filters);
        });
        pagination.appendChild(prevLi);
    }

    // Pages
    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement("li");
        li.classList.add("page-item");

        li.innerHTML = `
            <a class="page-link ${i === currentPage ? 'current active' : ''}" href="#" data-page="${i}">
                ${i}
            </a>
        `;

        li.querySelector("a").addEventListener("click", e => {
            e.preventDefault();
            const page = parseInt(e.target.dataset.page);
            loadProductsByCategoryBySlug(page, currentLimit, sort, filters);
        });

        pagination.appendChild(li);
    }

    // Bouton suivant
    if (currentPage < totalPages) {
        const nextLi = document.createElement("li");
        nextLi.classList.add("page-item");
        nextLi.innerHTML = `<a class="page-link" href="#">»</a>`;
        nextLi.querySelector("a").addEventListener("click", e => {
            e.preventDefault();
            loadProductsByCategoryBySlug(currentPage + 1, currentLimit, sort, filters);
        });
        pagination.appendChild(nextLi);
    }
}


/* ================================
   RENDER GLOBAL
================================ */

function renderProducts(products) {
    const container = document.querySelector(".shop-product");
    if (!container) return;

    container.innerHTML = "";

    if (!products || products.length === 0) {
        container.innerHTML = `<p class="text-center text-muted py-5">Aucun produit trouvé</p>`;
        return;
    }

    if (window.currentView === "list") {
        renderList(products);
    } else {
        renderGrid(products);
    }
}


/* ================================
   GRID VIEW
================================ */

function renderGrid(products) {
    const container = document.querySelector(".shop-product");

    products.forEach(p => {
        const img = p.images?.find(i => i.is_main)?.image_url?.replace(/\\/g, "/") || "placeholder.jpg";
        const price = p.prices?.[0]?.price || 0;
        const categoryName = p.category?.name || "";
        const categorySlug = p.category?.slug || "";
        const rating = p.rating || 0;
        const reviews = p.reviews?.length || 0;
        const prodSlug = p.slug || p.id;

        // ✅ Utilisation du helper pour le prix
        const priceHtml = formatProductPrice(price, p.promo);

        const li = document.createElement("li");
        li.classList.add("col-6", "col-md-3", "col-wd-2gdot4", "product-item", "mb-3", "grid-view");

        li.innerHTML = `
            <div class="product-item__outer h-100 w-100">
                <div class="product-item__inner px-xl-4 p-3">
                    <div class="mb-2">
                        <a href="/category-slug?slug=${categorySlug}" class="font-size-12 text-gray-5">
                            ${categoryName}
                        </a>
                    </div>
                    <h5 class="mb-1 product-item__title">
                        <a href="/single-product?slug=${prodSlug}" class="text-blue font-weight-bold">
                            ${p.name}
                        </a>
                    </h5>
                    <div class="mb-2 product-images-wrapper">
                        <a href="/single-product?slug=${prodSlug}" class="d-block text-center">
                            <img class="img-fluid" src="${API}/${img}" alt="${p.name}" style="max-height: 150px; object-fit: contain;">
                        </a>
                    </div>
                    <div class="flex-center-between mb-1">
                        <div class="prodcut-price">
                           ${priceHtml}
                        </div>
                    </div>
                    <div class="small text-warning">
                        ${'⭐'.repeat(Math.floor(rating))}${'☆'.repeat(5 - Math.floor(rating))} (${reviews})
                    </div>
                </div>
            </div>
        `;

        container.appendChild(li);
    });
}


/* ================================
   LIST VIEW AMÉLIORÉE - RESPONSIVE
================================ */

function renderList(products) {
    const container = document.querySelector(".shop-product");
    container.innerHTML = "";

    products.forEach(p => {
        const img = p.images?.find(i => i.is_main)?.image_url?.replace(/\\/g, "/") || "placeholder.jpg";
        const price = p.prices?.[0]?.price || 0;
        const categoryName = p.category?.name || "";
        const catSlug = p.category?.slug || "";
        const rating = p.rating || 0;
        const reviews = p.reviews_count || p.reviews?.length || 0;
        const prodSlug = p.slug || p.id;

        // ✅ Utilisation du helper pour le prix
        const priceHtml = formatProductPrice(price, p.promo);

        // ✅ Badge promo (si prix > 0 et promo existe)
        let promoBadge = '';
        if (p.promo && p.promo.discount_percent && price > 0) {
            promoBadge = `<span class="promo-badge">-${p.promo.discount_percent}%</span>`;
        }

        // ✅ Générer les étoiles
        let starsHtml = "";
        for (let i = 1; i <= 5; i++) {
            starsHtml += i <= rating
                ? `<small class="fas fa-star text-warning"></small>`
                : `<small class="far fa-star text-muted"></small>`;
        }

        // ✅ Récupérer les spécifications (max 6)
        const specs = p.specs || [];
        const specsToShow = specs.slice(0, 6);
        
        // ✅ Générer les specs en grille
        let specsHtml = "";
        if (specsToShow.length > 0) {
            specsHtml = '<div class="specs-grid">';
            specsToShow.forEach(spec => {
                specsHtml += `
                    <div class="spec-item">
                        <span class="spec-key">${spec.key}:</span>
                        <span class="spec-value">${spec.value}</span>
                    </div>
                `;
            });
            specsHtml += '</div>';
        }

        const div = document.createElement("div");
        div.classList.add("product-item__outer", "mb-3", "border", "rounded", "p-2", "product-list-hover", "list-item");

        div.innerHTML = `
            <div class="product-item__inner remove-prodcut-hover py-3 row g-0">
                <!-- Image colonne -->
                <div class="product-item__header col-12 col-md-4 col-lg-3 text-center mb-3 mb-md-0">
                    <div class="position-relative list-image-wrapper">
                        <a href="/single-product?slug=${prodSlug}" class="d-block h-100">
                            <img class="img-fluid list-product-img" src="${API}/${img}" alt="${p.name}">
                        </a>
                        ${promoBadge}
                    </div>
                </div>

                <!-- Infos produit colonne -->
                <div class="product-item__body col-12 col-md-5 col-lg-6 px-md-3">
                    <div class="mb-2">
                        <a href="/category-slug?slug=${catSlug}" class="font-size-12 text-gray-5 bg-light p-1 rounded">
                            ${categoryName}
                        </a>
                        ${p.brand?.name ? `<span class="font-size-12 text-gray-5 ml-2">${p.brand.name}</span>` : ''}
                    </div>

                    <h5 class="mb-2 product-item__title">
                        <a href="/single-product?slug=${prodSlug}" class="text-blue font-weight-bold">
                            ${p.name}
                        </a>
                    </h5>

                    <!-- Rating (visible sur tous) -->
                    <div class="d-flex align-items-center mb-3">
                        <div class="text-warning mr-2">
                            ${starsHtml}
                        </div>
                        <span class="text-secondary font-size-13">(${reviews} avis)</span>
                    </div>

                    <!-- ✅ Spécifications du produit -->
                    ${specsHtml}

                    <!-- Prix mobile (caché sur desktop) -->
                    <div class="prodcut-price mb-2 d-md-none mt-3">
                        ${priceHtml}
                    </div>
                </div>

                <!-- Footer prix + actions (desktop) -->
                <div class="product-item__footer col-md-3 d-none d-md-block">
                    <div class="mb-3">
                        <div class="prodcut-price mb-2">
                            ${priceHtml}
                        </div>
                        <a href="/single-product?slug=${prodSlug}" 
                           class="btn btn-sm btn-block btn-primary-dark btn-wide transition-3d-hover btn-prestige-3d">
                            <i class="ec ec-add-to-cart mr-2"></i> Ajouter
                        </a>
                    </div>
                    <div class="flex-horizontal-center justify-content-end">
                        <a href="javascript:void(0)" 
                           class="text-gray-6 font-size-13 wishlist-btn mr-3" 
                           data-id="${p.id}">
                            <i class="ec ec-favorites mr-1 font-size-15"></i>
                        </a>
                        
                    </div>
                </div>

                <!-- Bouton mobile (visible seulement sur mobile) -->
                <div class="col-12 d-md-none mt-3">
                    <a href="/single-product?slug=${prodSlug}" 
                       class="btn btn-block btn-primary-dark btn-prestige-3d">
                        <i class="ec ec-add-to-cart mr-2"></i> Ajouter au panier - ${price.toLocaleString()} XOF
                    </a>
                    <div class="d-flex justify-content-center mt-2">
                        <a href="javascript:void(0)" 
                           class="text-gray-6 font-size-13 wishlist-btn mr-4" 
                           data-id="${p.id}">
                            <i class="ec ec-favorites mr-1 font-size-15"></i> Wishlist
                        </a>
                       
                    </div>
                </div>
            </div>
        `;

        container.appendChild(div);
    });
}


/* ================================
   FILTER BUTTON (CORRIGÉ)
================================ */

function initFiltersButton() {
    const filterBtn = document.querySelector(".btn-primary-dark-w, .btn-primary-dark");
    if (!filterBtn) {
        console.warn("⚠️ Bouton filtre non trouvé");
        return;
    }

    filterBtn.addEventListener("click", e => {
        e.preventDefault();

        // Récupérer les marques sélectionnées
        const selectedBrands = [...document.querySelectorAll("input[id^='brand-']:checked, .brand-filter:checked")]
            .map(cb => cb.value || cb.id.replace("brand-", ""));

        // Récupérer les couleurs sélectionnées
        const selectedColors = [...document.querySelectorAll("input[id^='color-']:checked, .color-filter:checked")]
            .map(cb => cb.value || cb.id.replace("color-", ""));

        // Récupérer les prix
        const minPriceEl = document.getElementById("rangeSliderExample3MinResult") || 
                          document.querySelector(".min-price");
        const maxPriceEl = document.getElementById("rangeSliderExample3MaxResult") || 
                          document.querySelector(".max-price");
        
        const minPrice = minPriceEl ? parseInt(minPriceEl.dataset.value) || 0 : 0;
        const maxPrice = maxPriceEl ? parseInt(maxPriceEl.dataset.value) || 999999 : 999999;

        console.log("🔍 Filtres appliqués:", { 
            brands: selectedBrands, 
            colors: selectedColors, 
            minPrice, 
            maxPrice 
        });

        window.currentFilters = {
            brands: selectedBrands,
            colors: selectedColors,
            minPrice,
            maxPrice
        };

        // Recharger avec les filtres (page 1)
        loadProductsByCategoryBySlug(1, window.currentLimit, window.currentSort, window.currentFilters);
    });
}


/* ================================
    SORT (CORRIGÉ)
================================ */

function initSort() {
    const sortSelect = document.getElementById("sortSelect");
    if (!sortSelect) {
        console.warn("⚠️ Select de tri non trouvé");
        return;
    }

    // Initialiser avec la valeur actuelle
    sortSelect.value = window.currentSort;

    sortSelect.addEventListener("change", e => {
        const newSort = e.target.value;
        console.log("🔀 Tri changé:", newSort);

        window.currentSort = newSort;

        loadProductsByCategoryBySlug(
            1, // Revenir à la page 1 quand on change le tri
            window.currentLimit,
            newSort,
            window.currentFilters
        );
    });
}


/* ================================
   VIEW TOGGLE (CORRIGÉ)
================================ */

function initViewToggle() {
    const gridBtn = document.getElementById("view-grid");
    const listBtn = document.getElementById("view-list");

    if (!gridBtn && !listBtn) {
        console.warn("⚠️ Boutons de vue non trouvés");
        return;
    }

    if (gridBtn) {
        gridBtn.addEventListener("click", e => {
            e.preventDefault();
            console.log("🔲 Passage en vue grille");
            
            window.currentView = "grid";
            gridBtn.classList.add("active");
            if (listBtn) listBtn.classList.remove("active");
            
            renderProducts(window.lastProducts);
        });
    }

    if (listBtn) {
        listBtn.addEventListener("click", e => {
            e.preventDefault();
            console.log("📋 Passage en vue liste");
            
            window.currentView = "list";
            listBtn.classList.add("active");
            if (gridBtn) gridBtn.classList.remove("active");
            
            renderProducts(window.lastProducts);
        });
    }
}

// latestProd
// ------------------------------------------------------


async function loadLatestProducts() {
    try {
        const res = await fetch(`${API}/products/latest`);
        if (!res.ok) throw new Error("Erreur lors du chargement des derniers produits");

        let products = await res.json();

        // Limiter à 6 produits
        products = products.slice(0, 6);

        const container = document.querySelector(".latest-products-list");
        if (!container) return;

        container.innerHTML = ""; // reset

        products.forEach(p => {
            const img = p.images?.find(i => i.is_main)?.image_url?.replace(/\\/g, "/") 
                    || "placeholder.jpg";
            const priceObj = p.prices?.[0];
            const price = priceObj ? priceObj.price : 0;
            const prodSlug = p.slug || p.id || "";
            const url = `/single-product?slug=${prodSlug}`|| `/single-product?id=${p.id}`;

            // ✅ Utilisation du helper pour le prix
            // Le helper gère maintenant l'affichage normal ou promo
            const priceHtml = formatProductPrice(price, p.promo);

            // Générer les étoiles de rating
            const rating = Math.round(p.rating || 0);
            let starsHtml = "";
            for (let i = 1; i <= 5; i++) {
                starsHtml += i <= rating 
                    ? `<small class="fas fa-star"></small>` 
                    : `<small class="far fa-star text-muted"></small>`;
            }

            const li = document.createElement("li");
            li.classList.add("mb-4");

            li.innerHTML = `
                <div class="row">
                    <div class="col-auto">
                        <a href="${url}" class="d-block width-75">
                            <img class="img-fluid" src="${API}/${img}" alt="${p.name}">
                        </a>
                    </div>
                    <div class="col">
                        <h3 class="text-lh-1dot2 font-size-14 mb-0">
                            <a href="${url}">${p.name}</a>
                        </h3>
                        <div class="text-warning text-ls-n2 font-size-16 mb-1" style="width: 80px;">
                            ${starsHtml}
                        </div>
                        <div class="font-weight-bold">
                            ${priceHtml}
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(li);
        });

    } catch (err) {
        console.error("Erreur chargement Latest Products:", err);
    }
}

/* ================================
   RECHARGE SI BESOIN
================================ */

// Permet de recharger la page si l'utilisateur utilise le bouton retour
window.addEventListener("popstate", () => {
    loadProductsByCategoryBySlug(
        window.currentPage, 
        window.currentLimit, 
        window.currentSort, 
        window.currentFilters
    );
});
