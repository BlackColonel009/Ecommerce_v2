// ------------------------------------------------------------------------
// Produit recommandés
// ------------------------------------------------------------------------


// --- Mélanger les produits aléatoirement ---
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

async function loadrelatedinthiscategory() {
    try {
        const slugs = ["laptop", "smartphones", "desktop", "toner-encre"];
        const fetches = slugs.map(slug => fetch(`${API}/categories/category/${slug}`).then(r => r.json()));
        const results = await Promise.all(fetches);

        let products = results.flatMap(res => Array.isArray(res) ? res : res.data || []);

        // 🔹 Shuffle avant injection
        products = shuffleArray(products);

        const container = document.getElementById("category-printers");
        if (!container) return;

        container.innerHTML = "";

        products.forEach(p => {
            const img = p.images?.find(i => i.is_main)?.image_url?.replace(/\\/g, "/") || "placeholder.jpg";
            const price = p.prices?.[0]?.price || 0;
            const categoryName = p.category?.name || "";
            const catId = p.category?.id || "";
            const catSlug = p.category?.slug || "";
            const prodSlug = p.slug || "";

            // ✅ Utilisation du helper pour le prix
            const priceHtml = formatProductPrice(price, p.promo);

            const slide = document.createElement("div");
            slide.classList.add("js-slide", "products-group");

            slide.innerHTML = `
                <div class="product-item">
                    <div class="product-item__outer h-100 w-100">
                        <div class="product-item__inner px-wd-4 p-2 p-md-3">
                            <div class="product-item__body pb-xl-2">
                                <div class="mb-2"><a href="/category-slug?slug=${catSlug}" class="font-size-12 text-gray-5">${categoryName}</a></div>
                                <h5 class="mb-1 product-item__title"><a href="/single-product?slug=${prodSlug}" class="text-blue font-weight-bold">${p.name}</a></h5>
                                <div class="mb-2 product-images-wrapper">
                                    <a href="/single-product?slug=${prodSlug}" class="d-block text-center"><img class="img-fluid img-212X305 main-img" src="${API}/${img}" alt="${p.name}"></a>
                                </div>
                                <div class="banner-overlay"></div>
                                <div class="flex-center-between mb-1">
                                    <div class="prodcut-price">
                                        ${priceHtml}
                                    </div>
                                    <div class="d-none d-xl-block prodcut-add-cart">
                                        <a href="/single-product?slug=${prodSlug}" class="btn-add-cart btn-primary transition-3d-hover"><i class="ec ec-add-to-cart"></i></a>
                                    </div>
                                </div>
                            </div>
                            <div class="product-item__footer">
                                <div class="border-top pt-2 flex-center-between flex-wrap">
                                    
                                    <a href="javascript:void(0)" 
                                        class="text-gray-6 font-size-13 wishlist-btn" 
                                        data-id="${p.id}">
                                            <i class="ec ec-favorites mr-1 font-size-15"></i> Wishlist
                                        </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            container.appendChild(slide);
        });

        const $container = $(container);

        if ($container.hasClass('slick-initialized')) {
            $container.slick('refresh');
        } else {
            $container.slick({
                slidesToShow: parseInt(container.dataset.slidesShow || 5),
                slidesToScroll: parseInt(container.dataset.slidesScroll || 1),
                infinite: false,
                arrows: true,
                dots: true,
                appendDots: $container.closest(".position-relative").find(".u-slick__pagination"),
                prevArrow: '<button type="button" class="slick-prev" aria-label="Produits recommandés précédents"></button>',
                nextArrow: '<button type="button" class="slick-next" aria-label="Produits recommandés suivants"></button>',
                responsive: JSON.parse(container.dataset.responsive || "[]")
            });
        }

    } catch (err) {
        console.error("Erreur chargement slider imprimantes + scanners", err);
    }
}


// ----------------------------------------------------------------------------
// shop 
// ----------------------------------------------------------------------------

// --- Fonction principale ---


document.addEventListener("DOMContentLoaded", () => {
    // Charger les filtres disponibles depuis l'API
    fetch(`${API}/filter`)
        .then(res => res.json())
        .then(filters => {
        renderBrands(filters.brands || []);
        renderColors(filters.colors || []);

        if (filters.price?.min !== undefined && filters.price?.max !== undefined) {
            initPriceSlider(filters.price.min, filters.price.max);
        }
    })

        .catch(err => console.error("Erreur chargement filtres", err));

    // Initialisation des variables globales
    window.currentPage = 1;
    window.currentLimit = 20;
    window.currentSort = "default";
    window.currentFilters = {};
});

// Générer dynamiquement les marques
function renderBrands(brands) {
    const brandContainer = document.getElementById("brandFilters");
    brandContainer.innerHTML = "";
    brands.forEach(b => {
        const div = document.createElement("div");
        div.classList.add("form-group","d-flex","align-items-center","justify-content-between","mb-2","pb-1");
        div.innerHTML = `
            <div class="custom-control custom-checkbox">
                <input type="checkbox" class="custom-control-input" id="brand-${b.name}">
                <label class="custom-control-label" for="brand-${b.name}">${b.name}
                    <span class="text-gray-25 font-size-12 font-weight-normal"> (${b.count})</span>
                </label>
            </div>
        `;
        brandContainer.appendChild(div);
    });
}

// Générer dynamiquement les couleurs
function renderColors(colors) {
    const colorContainer = document.getElementById("colorFilters");
    colorContainer.innerHTML = "";
    colors.forEach(c => {
        const div = document.createElement("div");
        div.classList.add("form-group","d-flex","align-items-center","justify-content-between","mb-2","pb-1");
        div.innerHTML = `
            <div class="custom-control custom-checkbox">
                <input type="checkbox" class="custom-control-input" id="color-${c.name}">
                <label class="custom-control-label" for="color-${c.name}">${c.name}
                    <span class="text-gray-25 font-size-12 font-weight-normal"> (${c.count})</span>
                </label>
            </div>
        `;
        colorContainer.appendChild(div);
    });
}

// Initialiser le slider prix
function initPriceSlider(min, max) {
    if (!window.$ || !$.fn.ionRangeSlider) {
        console.warn("ionRangeSlider non chargé");
        return;
    }

    const slider = document.querySelector(".js-range-slider");
    if (!slider) return;

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



// --- Gestion du bouton Filter ---
document.addEventListener("DOMContentLoaded", () => {

    // ---------- bouton FILTER ----------
    const filterBtn = document.querySelector(".btn-primary-dark-w");
    if (filterBtn) {
        filterBtn.addEventListener("click", e => {
            e.preventDefault();

            const selectedBrands = [...document.querySelectorAll("input[id^='brand-']:checked")]
                .map(cb =>
                    cb.closest(".custom-control")
                      ?.querySelector("label")
                      ?.childNodes[0]
                      ?.textContent
                      ?.trim()
                )
                .filter(Boolean);

            const selectedColors = [...document.querySelectorAll("input[id^='color-']:checked")]
                .map(cb =>
                    cb.closest(".custom-control")
                      ?.querySelector("label")
                      ?.childNodes[0]
                      ?.textContent
                      ?.trim()
                )
                .filter(Boolean);

            const minPrice = parseInt(
                document.getElementById("rangeSliderExample3MinResult")?.dataset.value
            ) || 0;

            const maxPrice = parseInt(
                document.getElementById("rangeSliderExample3MaxResult")?.dataset.value
            ) || 999999;

            window.currentFilters = {
                brands: selectedBrands,
                colors: selectedColors,
                minPrice,
                maxPrice
            };

            loadAllProductsForShop(1, window.currentLimit, window.currentSort, window.currentFilters);
        });
    }

    // ---------- SORT ----------
    const sortSelect = document.getElementById("sortSelect");
    if (sortSelect) {
        sortSelect.addEventListener("change", e => {
            window.currentSort = e.target.value;
            window.currentPage = 1;
            loadAllProductsForShop(
                window.currentPage,
                window.currentLimit,
                window.currentSort,
                window.currentFilters
            );
        });
    }

});


async function loadAllProductsForShop(page = 1, limit = 20, sort = "default", filters = {}) {
    try {
        const params = new URLSearchParams({ page, limit, sort });

        if (filters.brands && filters.brands.length > 0) {
            params.append("brands", filters.brands.join(","));
        }
        if (filters.colors && filters.colors.length > 0) {
            params.append("colors", filters.colors.join(","));
        }
        if (filters.minPrice !== undefined && filters.maxPrice !== undefined) {
            params.append("minPrice", filters.minPrice);
            params.append("maxPrice", filters.maxPrice);
        }

        const res = await fetch(`${API}/products/all?${params.toString()}`);
        const data = await res.json();

        const products = data.data || [];
        const total = data.total || products.length;
        const currentPage = data.page || page;
        const currentLimit = data.limit || limit;

        const container = document.querySelector(".shop-product");
        if (!container) return;
        container.innerHTML = "";

        if (products.length === 0) {
            container.innerHTML = `<p class="text-center text-muted">Aucun produit trouvé</p>`;
            return;
        }

        // --- Injection des produits ---
        // --- Injection des produits selon vue active ---
        window.lastProducts = products;
        renderProducts(products);


        // --- Mettre à jour les compteurs ---
        const counterTop = document.getElementById("results-counter");
        const counterBottom = document.getElementById("pagination-counter");
        const start = (currentPage-1)*currentLimit+1;
        const end = Math.min(currentPage*currentLimit, total);
        if (counterTop) counterTop.textContent = `Affichage des résultats ${start}–${end} sur ${total}`;
        if (counterBottom) counterBottom.textContent = `Affichage des résultats ${start}–${end} sur ${total}`;

        // --- Pagination dynamique ---
        const pagination = document.getElementById("pagination");
        if (pagination) {
            pagination.innerHTML = "";
            const totalPages = Math.ceil(total / currentLimit);

            if (currentPage > 1) {
                const prevLi = document.createElement("li");
                prevLi.classList.add("page-item");
                prevLi.innerHTML = `<a class="page-link" href="#">← Pré</a>`;
                prevLi.querySelector("a").addEventListener("click", e => {
                    e.preventDefault();
                    loadAllProductsForShop(currentPage-1, currentLimit, sort, filters);
                });
                pagination.appendChild(prevLi);
            }

            for (let i = 1; i <= totalPages; i++) {
                const li = document.createElement("li");
                li.classList.add("page-item");
                li.innerHTML = `<a class="page-link ${i === currentPage ? 'current' : ''}" href="#">${i}</a>`;
                li.querySelector("a").addEventListener("click", e => {
                    e.preventDefault();
                    loadAllProductsForShop(i, currentLimit, sort, filters);
                });
                pagination.appendChild(li);
            }

            if (currentPage < totalPages) {
                const nextLi = document.createElement("li");
                nextLi.classList.add("page-item");
                nextLi.innerHTML = `<a class="page-link" href="#">Suiv →</a>`;
                nextLi.querySelector("a").addEventListener("click", e => {
                    e.preventDefault();
                    loadAllProductsForShop(currentPage+1, currentLimit, sort, filters);
                });
                pagination.appendChild(nextLi);
            }
        }

    } catch (err) {
        console.error("Erreur chargement produits", err);
    }
}


// ---------------------------------------------------------------------------
// Rendu GRILLE & list
// ---------------------------------------------------------------------------

function renderGrid(products) {
    const container = document.querySelector(".shop-product");
    container.innerHTML = "";
    
    products.forEach(p => {
        const img = p.images?.find(i => i.is_main)?.image_url?.replace(/\\/g, "/") || "placeholder.jpg";
        const price = p.prices?.[0]?.price || 0;
        const categoryName = p.category?.name || "";
        const catSlug = p.category?.slug || "";
        const prodSlug = p.slug || "";

        // ✅ Utilisation du helper pour le prix
        const priceDisplay = formatProductPrice(price, p.promo);
        
        // ✅ Gestion du badge promo (si promo existe et prix > 0)
        let promoBadge = '';
        if (p.promo && p.promo.discount_percent && price > 0) {
            promoBadge = `<span class="promo-badge">-${p.promo.discount_percent}%</span>`;
        }

        const li = document.createElement("li");
        li.classList.add("col-6","col-md-3","col-wd-2gdot4","product-item");
        
        li.innerHTML = `
            <div class="product-item__outer h-100 w-100">
                <div class="product-item__inner px-xl-4 p-3">
                    <div class="product-item__body pb-xl-2">
                        <div class="mb-2">
                            <a href="/category-slug?slug=${catSlug}" class="font-size-12 text-gray-5">${categoryName}</a>
                        </div>
                        <h5 class="mb-1 product-item__title">
                            <a href="/single-product?slug=${prodSlug}" class="text-blue font-weight-bold">${p.name}</a>
                        </h5>
                        <div class="mb-2 product-images-wrapper position-relative">
                            <a href="/single-product?slug=${prodSlug}" class="d-block text-center main-img">
                                <img class="img-fluid" src="${API}/${img}" alt="${p.name}">
                            </a>
                            ${promoBadge}
                        </div>
                        <div class="flex-center-between mb-1">
                            <div class="prodcut-price">
                                ${priceDisplay}
                            </div>
                            <div class="d-none d-xl-block prodcut-add-cart">
                                <a href="/single-product?slug=${prodSlug}" class="btn-add-cart btn-primary transition-3d-hover" aria-label="Voir ${p.name}">
                                    <i class="ec ec-add-to-cart"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(li);
    });
}

function renderList(products) {
    const container = document.querySelector(".shop-product");
    container.innerHTML = "";

    products.forEach(p => {
        const img = p.images?.find(i => i.is_main)?.image_url?.replace(/\\/g, "/") || "placeholder.jpg";
        const price = p.prices?.[0]?.price || 0;
        const categoryName = p.category?.name || "";
        const catId = p.category?.id || "";
        const rating = p.rating || 0;
        const reviews = p.reviews_count || 0;
        const comment = p.description || 0;
        const prodSlug = p.slug || "";
        const catSlug = p.category?.slug || "";

        // ✅ Utilisation du helper pour le prix
        const priceDisplay = formatProductPrice(price, p.promo);

        // Générer les étoiles
        let starsHtml = "";
        for (let i = 1; i <= 5; i++) {
            starsHtml += i <= rating
                ? `<small class="fas fa-star text-warning"></small>`
                : `<small class="far fa-star text-muted"></small>`;
        }

        // ✅ Récupérer les spécifications (max 4)
        const specs = p.specs || [];
        const specsToShow = specs.slice(0, 4);
        
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
        div.classList.add("product-item__outer", "mb-3", "list-item");
        
        div.innerHTML = `
            <div class="product-item__inner remove-prodcut-hover p-3">
                <div class="row g-0 h-100">
                    <!-- Image - taille fixe -->
                    <div class="product-item__header col-12 col-md-4 col-lg-3">
                        <div class="list-image-wrapper position-relative">
                            <a href="/single-product?slug=${prodSlug}" class="d-block h-100">
                                <img class="img-fluid list-product-img" src="${API}/${img}" alt="${p.name}">
                            </a>
                            ${p.promo && p.promo.discount_percent && price > 0 ? 
                                `<span class="promo-badge">-${p.promo.discount_percent}%</span>` : ''}
                        </div>
                    </div>

                    <!-- Infos produit - avec specs -->
                    <div class="product-item__body col-12 col-md-5 col-lg-6 px-md-3">
                        <div class="d-flex flex-column h-100">
                            <div class="mb-2">
                                <a href="/category-product?slug=${catSlug}" class="font-size-12 text-gray-5 bg-light p-1 rounded">
                                    ${categoryName}
                                </a>
                                ${p.brand?.name ? `<span class="font-size-12 text-gray-5 ml-2">${p.brand.name}</span>` : ''}
                            </div>

                            <h5 class="product-list-title mb-2">
                                <a href="/single-product?slug=${prodSlug}" class="text-blue font-weight-bold">
                                    ${p.name}
                                </a>
                            </h5>

                            <div class="d-flex align-items-center mb-2">
                                <div class="text-warning mr-2">
                                    ${starsHtml}
                                </div>
                                <span class="text-secondary font-size-13">(${reviews} avis)</span>
                            </div>

                            <!-- ✅ Spécifications fixes -->
                            ${specsHtml}

                            <!-- Prix mobile -->
                            <div class="prodcut-price mt-auto d-md-none">
                                ${priceDisplay}
                            </div>
                        </div>
                    </div>

                    <!-- Footer prix + actions (desktop) -->
                    <div class="product-item__footer col-md-3 d-none d-md-flex flex-column justify-content-between">
                        <div class="prodcut-price mb-3">
                            ${priceDisplay}
                        </div>
                        
                        <a href="/single-product?slug=${prodSlug}" 
                           class="btn btn-sm btn-primary btn-prestige-3d w-100 mb-2">
                            <i class="ec ec-add-to-cart mr-2"></i> Ajouter
                        </a>
                        
                        <div class="d-flex justify-content-end">
                            <a href="#" class="text-gray-6 wishlist-btn mr-3" data-id="${p.id}">
                                <i class="ec ec-favorites"></i>
                            </a>
                            <a href="/compare" class="text-gray-6">
                                <i class="ec ec-compare"></i>
                            </a>
                        </div>
                    </div>

                    <!-- Bouton mobile -->
                    <div class="col-12 d-md-none mt-3">
                        <a href="/single-product?slug=${prodSlug}" 
                           class="btn btn-block btn-primary btn-prestige-3d">
                            <i class="ec ec-add-to-cart mr-2"></i> Ajouter - ${price.toLocaleString()} XOF
                        </a>
                        <div class="d-flex justify-content-center mt-2">
                            <a href="#" class="text-gray-6 wishlist-btn mr-4" data-id="${p.id}">
                                <i class="ec ec-favorites mr-1"></i> Wishlist
                            </a>
                            <a href="/compare" class="text-gray-6">
                                <i class="ec ec-compare mr-1"></i> Compare
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.appendChild(div);
    });
}

function renderProducts(products) {
    const activeView = document.querySelector(".nav-tab-shop .nav-link.active").id;
    if (activeView === "view-grid") {
        renderGrid(products);
    } else {
        renderList(products);
    }
}

// Brancher les icônes Grid / Liste
document.getElementById("view-grid").addEventListener("click", e => {
    e.preventDefault();
    document.getElementById("view-grid").classList.add("active");
    document.getElementById("view-list").classList.remove("active");
    renderProducts(window.lastProducts || []);
});

document.getElementById("view-list").addEventListener("click", e => {
    e.preventDefault();
    document.getElementById("view-list").classList.add("active");
    document.getElementById("view-grid").classList.remove("active");
    renderProducts(window.lastProducts || []);
});


// ---------------------------------------------------------------------------
// LAST product
// ---------------------------------------------------------------------------
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


// Initialisation
document.addEventListener("DOMContentLoaded", () => {
    window.currentPage = 1;
    window.currentLimit = 20;
    window.currentSort = "default";
    window.currentFilters = {};

    const sortSelect = document.getElementById("sortSelect");
    const showSelect = document.getElementById("showSelect");

    if (sortSelect) {
        sortSelect.addEventListener("change", e => {
            window.currentSort = e.target.value;
            window.currentPage = 1;
            loadAllProductsForShop(window.currentPage, window.currentLimit, window.currentSort, window.currentFilters);
        });
    }

    if (showSelect) {
        showSelect.addEventListener("change", e => {
            const value = e.target.value;
            if (value === "40") window.currentLimit = 40;
            else if (value === "all") window.currentLimit = 9999;
            else window.currentLimit = 20;
            window.currentPage = 1;
            loadAllProductsForShop(window.currentPage, window.currentLimit, window.currentSort, window.currentFilters);
        });
    }

    // Premier chargement avec filtres vides
    loadAllProductsForShop(window.currentPage, window.currentLimit, window.currentSort, window.currentFilters);
    loadrelatedinthiscategory(); // ton autre fonction
    loadLatestProducts();
});
