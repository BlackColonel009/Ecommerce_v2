
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

    $(".js-range-slider").ionRangeSlider({
        type: "double",
        min,
        max,
        from: min,
        to: max,
        grid: false,
        onFinish: data => {
            const minEl = document.getElementById("rangeSliderExample3MinResult");
            const maxEl = document.getElementById("rangeSliderExample3MaxResult");
            if (minEl) minEl.textContent = data.from;
            if (maxEl) maxEl.textContent = data.to;
        }
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
                document.getElementById("rangeSliderExample3MinResult")?.textContent
            ) || 0;

            const maxPrice = parseInt(
                document.getElementById("rangeSliderExample3MaxResult")?.textContent
            ) || 999999;

            window.currentFilters = {
                brands: selectedBrands,
                colors: selectedColors,
                minPrice,
                maxPrice
            };

            loadProductsByCategory(1, window.currentLimit, window.currentSort, window.currentFilters);
        });
    }

    // ---------- SORT ----------
    const sortSelect = document.getElementById("sortSelect");
    if (sortSelect) {
        sortSelect.addEventListener("change", e => {
            window.currentSort = e.target.value;
            window.currentPage = 1;
            loadProductsByCategory(
                window.currentPage,
                window.currentLimit,
                window.currentSort,
                window.currentFilters
            );
        });
    }

});


async function loadProductsByCategory(page = 1, limit = 20, sort = "default", filters = {}) {
    try {
        const params = new URLSearchParams({ page, limit, sort });

        if (filters.brands?.length) params.append("brands", filters.brands.join(","));
        if (filters.colors?.length) params.append("colors", filters.colors.join(","));
        if (filters.minPrice !== undefined && filters.maxPrice !== undefined) {
            params.append("minPrice", filters.minPrice);
            params.append("maxPrice", filters.maxPrice);
        }

        const urlParams = new URLSearchParams(window.location.search);
        const categoryId = urlParams.get("id");
        if (!categoryId) {
            console.error("Aucun id de catégorie trouvé dans l'URL");
            return;
        }

        const res = await fetch(`${API}/categories/${categoryId}?${params.toString()}`);
        const data = await res.json();

        // --- Récupération des produits depuis la réponse enrichie ---
        const products = data.products || [];
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

        // --- Injection des produits selon vue active ---
        window.lastProducts = products;
        
        
        if (!window.currentView) {
            window.currentView = "grid"; // ou "list"
        }

        if (window.currentView === "list") {
            renderList(products);
        } else {
            renderGrid(products);
        }


        // --- Mettre à jour les compteurs ---
        const counterTop = document.getElementById("results-counter");
        const counterBottom = document.getElementById("pagination-counter");
        const start = (currentPage - 1) * currentLimit + 1;
        const end = Math.min(currentPage * currentLimit, total);
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
                    loadProductsByCategory(currentPage - 1, currentLimit, sort, filters);
                });
                pagination.appendChild(prevLi);
            }

            for (let i = 1; i <= totalPages; i++) {
                const li = document.createElement("li");
                li.classList.add("page-item");
                li.innerHTML = `<a class="page-link ${i === currentPage ? 'current' : ''}" href="#">${i}</a>`;
                li.querySelector("a").addEventListener("click", e => {
                    e.preventDefault();
                    loadProductsByCategory(i, currentLimit, sort, filters);
                });
                pagination.appendChild(li);
            }

            if (currentPage < totalPages) {
                const nextLi = document.createElement("li");
                nextLi.classList.add("page-item");
                nextLi.innerHTML = `<a class="page-link" href="#">Suiv →</a>`;
                nextLi.querySelector("a").addEventListener("click", e => {
                    e.preventDefault();
                    loadProductsByCategory(currentPage + 1, currentLimit, sort, filters);
                });
                pagination.appendChild(nextLi);
            }
        }

    } catch (err) {
        console.error("Erreur chargement produits par catégorie", err);
    }
}



function renderGrid(products) {
    const container = document.querySelector(".shop-product");
    container.innerHTML = "";
    products.forEach(p => {
        const img = p.images?.find(i => i.is_main)?.image_url?.replace(/\\/g, "/") || "placeholder.jpg";
        const price = p.prices?.[0]?.price || 0;
        const categoryName = p.category?.name || "";
        const catId = p.category?.id || "";

        const li = document.createElement("li");
        li.classList.add("col-6","col-md-3","col-wd-2gdot4","product-item");
        li.innerHTML = `
                <div class="product-item__outer h-100">
                    <div class="product-item__inner px-xl-4 p-3">
                        <div class="product-item__body pb-xl-2">
                            <div class="mb-2"><a href="/category-product?id=${catId}" class="font-size-12 text-gray-5">${categoryName}</a></div>
                            <h5 class="mb-1 product-item__title"><a href="/single-product?id=${p.id}" class="text-blue font-weight-bold">${p.name}</a></h5>
                            <div class="mb-2 product-images-wrapper">
                                <a href="/single-product?id=${p.id}" class="d-block text-center main-img"><img class="img-fluid" src="${API}/${img}" alt="${p.name}"></a>
                            </div>
                            
                            <div class="banner-overlay"></div>
                            <div class="flex-center-between mb-1">
                                <div class="prodcut-price"><div class="text-gray-100"><span class="js-price text-gray-100" data-fcfa="${price}">${price} XOF</span></div></div>
                                <div class="d-none d-xl-block prodcut-add-cart">
                                    <a href="/single-product?id=${p.id}" class="btn-add-cart btn-primary transition-3d-hover"><i class="ec ec-add-to-cart"></i></a>
                                </div>
                            </div>
                        </div>
                        <div class="product-item__footer">
                            <div class="border-top pt-2 flex-center-between flex-wrap">
                                <a href="/category-slug" class="text-gray-6 font-size-13"><i class="ec ec-compare mr-1 font-size-15"></i> Compare</a>
                                <a href="javascript:void(0)" 
                                class="text-gray-6 font-size-13 wishlist-btn" 
                                data-id="${p.id}">
                                    <i class="ec ec-favorites mr-1 font-size-15"></i> Wishlist
                                </a>

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
        const rating = p.rating || 0; // suppose que ton API renvoie un champ "rating"
        const reviews = p.reviews_count || 0; // idem pour le nombre d’avis
        const comment = p.description || 0;

        // Générer les étoiles
        let starsHtml = "";
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                starsHtml += `<small class="fas fa-star"></small>`;
            } else {
                starsHtml += `<small class="far fa-star text-muted"></small>`;
            }
        }

        const div = document.createElement("div");
        div.classList.add("product-item__inner","remove-prodcut-hover","py-4","row");
        div.innerHTML = `
            <!-- Image -->
            <div class="product-item__header col-6 col-md-4">
                <div class="mb-2">
                    <a href="/single-product?id=${p.id}" class="d-block text-center">
                        <img class="img-fluid" src="${API}/${img}" alt="${p.name}">
                    </a>
                </div>
            </div>

            <!-- Infos produit -->
            <div class="product-item__body col-6 col-md-5">
                <div class="pr-lg-10">
                    <div class="mb-2">
                        <a href="/category-product?id=${catId}" class="font-size-12 text-gray-5">${categoryName}</a>
                    </div>
                    <h5 class="mb-2 product-item__title">
                        <a href="/single-product?id=${p.id}" class="text-blue font-weight-bold">${p.name}</a>
                    </h5>

                    <!-- Prix mobile -->
                    <div class="prodcut-price mb-2 d-md-none">
                        <div class="text-gray-100"><span class="js-price text-gray-100" data-fcfa="${price}">${price} XOF</span></div>
                    </div>

                    <!-- Rating -->
                    <div class="mb-3 d-none d-md-block">
                        <a class="d-inline-flex align-items-center small font-size-14" href="#">
                            <div class="text-warning mr-2">
                                ${starsHtml}
                            </div>
                            <span class="text-secondary">(${reviews})</span>
                        </a>
                    </div>

                    <!-- Features / bullet points -->
                    <ul class="font-size-12 p-0 text-gray-110 mb-4 d-none d-md-block">
                        <li class="line-clamp-1 mb-1 list-bullet">Tout neuf et de Bonne qualité</li>
                        <li class="line-clamp-1 mb-1 list-bullet">Durable et avec Garantie</li>
                        <li class="line-clamp-1 mb-1 list-bullet">Livraison gratuite à partir d'un achat au prix supérieur à <span class="js-price text-red" data-fcfa="30000">30000 <sup>XOF</sup></span></li>
                    </ul>
                </div>
            </div>

            <!-- Footer prix + actions -->
            <div class="product-item__footer col-md-3 d-md-block">
                <div class="mb-3">
                    <div class="prodcut-price mb-2">
                        <div class="text-gray-100"><span class="js-price text-gray-100" data-fcfa="${price}">${price} XOF</span></div>
                    </div>
                    <div class="prodcut-add-cart">
                        <a href="/single-product?id=${p.id}" class="btn btn-sm btn-block btn-primary-dark btn-wide transition-3d-hover">
                            <i class="ec ec-add-to-cart"></i> Ajouter au panier
                        </a>
                    </div>
                </div>
                <div class="flex-horizontal-center justify-content-between justify-content-wd-center flex-wrap">
                    <a href="/category-slug" class="text-gray-6 font-size-13 mx-wd-3"><i class="ec ec-compare mr-1 font-size-15"></i> Compare</a>
                    <a href="javascript:void(0)" 
                                class="text-gray-6 font-size-13 wishlist-btn" 
                                data-id="${p.id}">
                                    <i class="ec ec-favorites mr-1 font-size-15"></i> Wishlist
                                </a>

                </div>
            </div>
        `;
        container.appendChild(div);
    });
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

function renderProducts(products) {
    const activeView = document.querySelector(".nav-tab-shop .nav-link.active").id;
    if (activeView === "view-grid") {
        renderGrid(products);
    } else {
        renderList(products);
    }
}

// --------------------------------------------------------------
// Plus vendue 
// --------------------------------------------------------------





// latestProd
// ------------------------------------------------------



// ------------------------------------------------------------------------
// plus vendu dans ces catégories
// ------------------------------------------------------------------------





document.addEventListener("DOMContentLoaded", () => {
    console.log("📦 DOMContentLoaded");
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
            loadProductsByCategory(window.currentPage, window.currentLimit, window.currentSort, window.currentFilters);
        });
    }

    if (showSelect) {
        showSelect.addEventListener("change", e => {
            const value = e.target.value;
            if (value === "40") window.currentLimit = 40;
            else if (value === "all") window.currentLimit = 9999;
            else window.currentLimit = 20;
            window.currentPage = 1;
            loadProductsByCategory(window.currentPage, window.currentLimit, window.currentSort, window.currentFilters);
        });
    }

    // Premier chargement avec filtres vides
    loadProductsByCategory(window.currentPage, window.currentLimit, window.currentSort, window.currentFilters);

});
