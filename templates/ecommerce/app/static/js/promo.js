

function shuffleArray(array) {
    return array.sort(() => Math.random() - 0.5);
}

function destroySlick(container) {
    if (!container || typeof window.jQuery === "undefined" || !$.fn.slick) return;

    const $container = $(container);
    if ($container.hasClass("slick-initialized")) {
        $container.slick("unslick");
    }
}

function initProductCarousel(container, visibleSlides = 4) {
    if (!container || typeof window.jQuery === "undefined" || !$.fn.slick) return;

    const slideCount = container.querySelectorAll(":scope > .js-slide").length;
    if (!slideCount) return;

    const slidesAt = breakpointSlides => Math.min(breakpointSlides, slideCount);
    const showNavigation = slideCount > Math.min(visibleSlides, slideCount);

    $(container).slick({
        slidesToShow: slidesAt(visibleSlides),
        slidesToScroll: 1,
        infinite: slideCount > visibleSlides,
        arrows: showNavigation,
        dots: showNavigation,
        adaptiveHeight: false,
        responsive: [
            { breakpoint: 1200, settings: { slidesToShow: slidesAt(3), arrows: slideCount > 3, dots: slideCount > 3 } },
            { breakpoint: 768, settings: { slidesToShow: slidesAt(2), arrows: slideCount > 2, dots: slideCount > 2 } },
            { breakpoint: 480, settings: { slidesToShow: 1, arrows: slideCount > 1, dots: slideCount > 1 } }
        ]
    });
}

//********* promo 1 *********

async function loadProducts(promoType, tabId) {
    try {
        const res = await fetch(`${API}/products/${promoType}`);
        if (!res.ok) throw new Error("Erreur lors du chargement des produits");

        const products = await res.json();
        const ul = document.querySelector(`#${tabId} ul.products-group`);
        if (!ul) return;
        ul.classList.add('prestige-3d');

        ul.innerHTML = ""; // On vide les produits existants

        shuffleArray(products).slice(0, 3).forEach(p => {

            const li = document.createElement("li");
            li.className = "col-6 col-md-4 col-xl product-item";

            // Sécurisation des données
            const prodSlug = p.slug || "unknown-product";
            const catId =  p.category?.id ?? p.id;
            const catSlug = p.category?.slug ?? "unknown-category";
            const categoryName = p.category?.name ?? "Unknown";
            const categoryId = p.category?.id ?? "#";
            
            // Image principale
            const mainImage = (p.images?.find(img => img.is_main) || p.images?.[0])?.image_url?.replace(/\\/g, "/") || "placeholder.jpg";

            // Prix
            const price = p.prices?.length > 0 ? p.prices[0].price : 0;

            // ✅ AJOUT DE LA LIGNE MANQUANTE
            const priceHtml = formatProductPrice(price, p.promo);

            li.innerHTML = `
                <div class="product-item__outer h-100 w-100">
                    <div class="product-item__inner px-xl-4 p-3">
                        <div class="product-item__body pb-xl-2">
                            <div class="mb-2">
                                <a href="/category-slug?slug=${catSlug}" class="font-size-12 text-gray-5">${categoryName}</a>
                            </div>

                            <h5 class="mb-1 product-item__title">
                                <a href="/single-product?slug=${prodSlug}" class="text-blue font-weight-bold">
                                    ${p.name}
                                </a>
                            </h5>

                            <div class="mb-2 product-images-wrapper">
                                <a href="/single-product?slug=${prodSlug}" class="d-block text-center">
                                    <div class=" text-center position-relative">
                                        <img class="img-fluid " src="${API}/${mainImage}" alt="${p.name}" loading="lazy" decoding="async">
                                    </div>
                                </a>
                            
                            </div>
                            
                            <div class="flex-center-between mb-1">
                                <div class="prodcut-price">
                                    ${priceHtml}  <!-- ← ICI ON UTILISE priceHtml -->
                                </div>

                                <div class="d-none d-xl-block prodcut-add-cart">
                                    <a href="/single-product?slug=${prodSlug}" class="btn-add-cart btn-primary transition-3d-hover btn-prestige-3d icon-only">
                                        <i class="ec ec-add-to-cart"></i>
                                    </a>
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
            `;
            ul.appendChild(li);
        });

    } catch(err) {
        console.error(err);
    }
}

//********* promo 2 *********

// Charger les produits par tag
async function loadFeaturedBanner() {
    try {
        const res = await fetch(`${API}/products/featured`);
        const data = await res.json();

        // Limiter à 3 produits et mélanger
        const products = shuffleArray(data).slice(0, 3);

        const container = document.getElementById("featured-banner");
        container.innerHTML = ""; // nettoyer le conteneur

        products.forEach(p => {
            const mainImage = p.images?.length > 0 
                ? p.images.find(img => img.is_main)?.image_url.replace(/\\/g, "/") 
                : "placeholder.jpg";

            const div = document.createElement("div");
            div.className = "col-md-6 mb-4 mb-xl-0 col-wd-4 d-md-none d-wd-block";
            div.dataset.productCard = "";
            div.dataset.productId = p.id;
            

            div.innerHTML = `
                <a href="/shop" class="d-black text-gray-90 ">
                    <div class="min-height-166 py-1 py-xl-2 py-wd-4 d-flex bg-gray-1 align-items-center banner-shine">
                        <div class="col-6 col-xl-7 col-wd-6 pr-0">
                            <img class="img-fluid img-fixed img-246x176 " src="${API}/${mainImage}" alt="${p.brand?.name || 'Product'}" loading="lazy" decoding="async">
                        </div>
                        <div class="col-6 col-xl-5 col-wd-6 pr-xl-4 pr-wd-3">
                            <div class="mb-2 pb-1 font-size-18 ">
                                <strong>${p.category?.name || "Featured Product"}</strong>
                            </div>
                            
                            <div class="mb-2 pb-1 font-size-18 font-weight-light text-ls-n1 text-lh-23">
                                ${p.name || "Featured Product"}
                            </div>
                            <div class="link text-gray-90 font-weight-bold font-size-15">
                                    Voir le produit
                                <span class="link__icon ml-1">
                                    <span class="link__icon-inner"><i class="ec ec-arrow-right-categproes"></i></span>
                                </span>
                            </div>
                        </div>
                    </div>
                </a>
            `;
            container.appendChild(div);
        });

    } catch (err) {
        console.error("Erreur chargement produits vedette :", err);
    }
}

// Shuffle utilitaire
function shuffleArray(array) {
    return array.sort(() => Math.random() - 0.5);
}

// ************* Promo Deal of the weak **************/

async function loadDeals() {
    try {
        const res = await fetch(`${API}/marketing/promo/active`);
        const promos = await res.json();

        const container = document.getElementById("deals-carousel");
        if (!container) return;

        destroySlick(container);
        container.innerHTML = "";

        // Limiter à 3 deals max
        promos.slice(0, 3).forEach(promoData => {
            const promo = promoData.promo;
            const product = promoData.product;

            if (!product) return;

            // Prix et calculs de remise
            const oldPrice = product.prices?.[0]?.price || 0;
            const discountPercent = promo.discount_percent || 0;
            const amountSaved = Math.round(oldPrice * discountPercent / 100);
            const newPrice = oldPrice - amountSaved;
            const prodSlug = product.slug || product.id || "";
            const url = `/single-product?slug=${prodSlug}`|| `/single-product?id=${product.id}`;

            // ✅ Utilisation du helper deal pour le prix
            const dealPriceHtml = formatDealPrice(oldPrice, discountPercent, amountSaved, newPrice);

            // Pour l'affichage du stock (si disponible)
            const stockDisponible = product.inventory?.quantity || 0;
            
            // Image principale
            const mainImage = product.images?.find(img => img.is_main)?.image_url.replace(/\\/g, "/") || "placeholder.jpg";

            const slide = document.createElement("div");
            slide.className = "js-slide";
            slide.dataset.productCard = "";
            slide.dataset.productId = product.id;

            slide.innerHTML = `
            <div class="p-4 p-xl-0 p-wd-4 border border-xl-0 border-width-2 border-primary borders-radius-20 bg-white ">
                <div class="row align-items-md-center">
                    <div class="col-md-6 col-xl-7 col-wd-6 px-0 align-self-center">
                        <div class="d-inline-flex justify-content-between align-items-center position-absolute left-3 top-0 z-index-9">
                            <div class="d-flex align-items-center flex-column justify-content-center bg-primary rounded-pill height-75 width-75 text-lh-1">
                                <span class="font-size-20 font-weight-bold">-${discountPercent}%</span>
                                <div class="font-size-12 font-weight-bold"><span class="js-price" data-fcfa="${amountSaved}">${amountSaved} XOF</span></div>
                            </div>
                        </div>
                        <div class="mb-4 mb-md-0">
                            <div class="row align-items-center">
                                <div class="col">
                                    <a href="${url}" class="d-block text-center">
                                        <img class="img-fluid mx-auto img-380X350" src="${API}/${mainImage}" alt="${product.name}" loading="lazy" decoding="async">
                                    </a>
                                </div>
                                <div class="col-auto d-none d-xl-block d-wd-none">
                                    <ul class="list-group rounded-0">
                                        ${[...Array(4)].map((_, i) => `
                                        <li class="list-group-item my-1 p-0 border-0">
                                            <a class="js-fancybox max-width-70 u-media-viewer" href="javascript:;"
                                                data-src="${API}/${mainImage}"
                                                data-fancybox="fancyboxGallery${product.id}"
                                                data-caption="${product.name} - image #${i+1}"
                                                data-speed="700"
                                                data-is-infinite="true">
                                                <img class="img-fluid border img-380X350" src="${API}/${mainImage}" alt="${product.name}" loading="lazy" decoding="async">
                                                <span class="u-media-viewer__container">
                                                    <span class="u-media-viewer__icon">
                                                        <span class="fas fa-plus u-media-viewer__icon-inner"></span>
                                                    </span>
                                                </span>
                                            </a>
                                        </li>`).join('')}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6 col-xl-5 col-wd-6">
                        <div class="space-top-xl-2 space-top-wd-0 mt-xl-4 mt-wd-0">
                            <h5 class="mb-3 mb-xl-2 mb-wd-1 font-size-14 text-center mx-auto max-width-180 text-lh-18">
                                <a href="${url}" class="text-blue font-weight-bold">${product.name}</a>
                            </h5>
                            
                            <!-- ✅ PRIX GÉRÉ PAR LE HELPER -->
                            ${dealPriceHtml}
                            
                            <!-- Barre de progression TEMPORELLE -->
                            <div class="mb-4 mb-xl-5 mb-wd-2 pb-wd-1 mx-2">
                                <div class="d-flex justify-content-between align-items-center mb-1">
                                    <span class="font-size-12 text-gray-2">Temps restant:</span>
                                    <span class="font-size-12 font-weight-bold text-primary time-left" id="time-left-${product.id}"></span>
                                </div>
                                <div class="rounded-pill bg-gray-3 height-14 position-relative">
                                    <span class="time-progress-bar position-absolute left-0 top-0 bottom-0 rounded-pill" 
                                          data-start="${promo.start_date}" 
                                          data-end="${promo.end_date}"
                                          data-product-id="${product.id}"
                                          style="width: 0%;"></span>
                                </div>
                            </div>

                            <!-- Stock disponible (si présent dans l'API) -->
                            ${stockDisponible > 0 ? `
                            <div class="mb-3 text-center">
                                <span class="badge badge-pill badge-success px-3 py-2">
                                    <i class="fas fa-box mr-1"></i> Stock: ${stockDisponible} disponible(s)
                                </span>
                            </div>
                            ` : ''}

                            <!-- Compte à rebours -->
                            <div class="mb-2">
                                <h6 class="font-size-15 text-gray-2 text-center mb-xl-3 mb-wd-2">⏳ L'offre expire dans :</h6>
                                <div class="js-countdown d-flex justify-content-center" data-end-date="${promo.end_date}">
                                    <div class="text-lh-1">
                                        <div class="text-gray-2 font-size-30 bg-gray-4 py-2 px-2 rounded-sm mb-2">
                                            <span class="js-cd-days">00</span>
                                        </div>
                                        <div class="text-gray-2 font-size-12 text-center">JOURS</div>
                                    </div>
                                    <div class="mx-1 pt-1 text-gray-2 font-size-24">:</div>
                                    <div class="text-lh-1">
                                        <div class="text-gray-2 font-size-30 bg-gray-4 py-2 px-2 rounded-sm mb-2">
                                            <span class="js-cd-hours">00</span>
                                        </div>
                                        <div class="text-gray-2 font-size-12 text-center">HEURES</div>
                                    </div>
                                    <div class="mx-1 pt-1 text-gray-2 font-size-24">:</div>
                                    <div class="text-lh-1">
                                        <div class="text-gray-2 font-size-30 bg-gray-4 py-2 px-2 rounded-sm mb-2">
                                            <span class="js-cd-minutes">00</span>
                                        </div>
                                        <div class="text-gray-2 font-size-12 text-center">MIN</div>
                                    </div>
                                    <div class="mx-1 pt-1 text-gray-2 font-size-24">:</div>
                                    <div class="text-lh-1">
                                        <div class="text-gray-2 font-size-30 bg-gray-4 py-2 px-2 rounded-sm mb-2">
                                            <span class="js-cd-seconds">00</span>
                                        </div>
                                        <div class="text-gray-2 font-size-12 text-center">SEC</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            `;

            // Initialiser la barre de progression temporelle
            const timeBar = slide.querySelector(".time-progress-bar");
            if (timeBar && promo.start_date && promo.end_date) {
                initTimeProgress(timeBar, promo.start_date, promo.end_date);
            }

            container.appendChild(slide);
        });

        // Initialiser les countdowns
        document.querySelectorAll(".js-countdown").forEach(initCountdown);

        // Ce carrousel ne doit jamais réinitialiser les autres Slick de la page.
        const dealCount = container.querySelectorAll(":scope > .js-slide").length;
        if (dealCount && typeof window.jQuery !== "undefined" && $.fn.slick) {
            $(container).slick({
                slidesToShow: 1,
                slidesToScroll: 1,
                infinite: dealCount > 1,
                arrows: dealCount > 1,
                dots: dealCount > 1,
                adaptiveHeight: true,
                prevArrow: '<button type="button" class="nt-deals-arrow nt-deals-arrow--prev" aria-label="Offre précédente"><i class="fas fa-chevron-left" aria-hidden="true"></i></button>',
                nextArrow: '<button type="button" class="nt-deals-arrow nt-deals-arrow--next" aria-label="Offre suivante"><i class="fas fa-chevron-right" aria-hidden="true"></i></button>'
            });
        }

    } catch (err) {
        console.error("Erreur lors du chargement des deals:", err);
    }
}


/**
 * Initialise le compte à rebours
 */
function initCountdown(cd) {
    const end = new Date(cd.dataset.endDate).getTime();

    function update() {
        const now = Date.now();
        const diff = end - now;

        if (diff <= 0) {
            cd.querySelector(".js-cd-days").textContent = "00";
            cd.querySelector(".js-cd-hours").textContent = "00";
            cd.querySelector(".js-cd-minutes").textContent = "00";
            cd.querySelector(".js-cd-seconds").textContent = "00";
            
            // Optionnel : masquer ou changer le style de l'offre expirée
            const slide = cd.closest('.js-slide');
            if (slide) {
                slide.style.opacity = "0.5";
            }
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        cd.querySelector(".js-cd-days").textContent = String(days).padStart(2, "0");
        cd.querySelector(".js-cd-hours").textContent = String(hours).padStart(2, "0");
        cd.querySelector(".js-cd-minutes").textContent = String(minutes).padStart(2, "0");
        cd.querySelector(".js-cd-seconds").textContent = String(seconds).padStart(2, "0");
    }

    update();
    setInterval(update, 1000);
}

/**
 * Initialise la barre de progression temporelle
 */
function initTimeProgress(barElement, startDate, endDate) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const productId = barElement.dataset.productId;
    const timeLeftElement = document.getElementById(`time-left-${productId}`);

    function update() {
        const now = Date.now();
        
        // Offre pas encore commencée
        if (now < start) {
            barElement.style.width = "0%";
            if (timeLeftElement) timeLeftElement.textContent = "Pas encore commencé";
            barElement.style.background = "#6c757d"; // Gris
            return;
        }
        
        // Offre terminée
        if (now > end) {
            barElement.style.width = "100%";
            if (timeLeftElement) timeLeftElement.textContent = "Expiré";
            barElement.style.background = "#dc3545"; // Rouge
            return;
        }
        
        // Calcul du temps écoulé
        const total = end - start;
        const elapsed = now - start;
        const remaining = end - now;
        const percent = (elapsed / total) * 100;
        
        // Mise à jour de la barre
        barElement.style.width = percent.toFixed(2) + "%";
        
        // Changer la couleur selon le temps restant
        if (remaining < 3600000) { // Moins d'1 heure
            barElement.style.background = "#dc3545"; // Rouge
        } else if (remaining < 86400000) { // Moins de 24h
            barElement.style.background = "#ffc107"; // Jaune
        } else {
            barElement.style.background = "#28a745"; // Vert
        }
        
        // Afficher le temps restant formaté
        if (timeLeftElement) {
            const hours = Math.floor(remaining / 3600000);
            const minutes = Math.floor((remaining % 3600000) / 60000);
            
            if (hours > 24) {
                const days = Math.floor(hours / 24);
                timeLeftElement.textContent = `${days} jour${days > 1 ? 's' : ''}`;
            } else if (hours > 0) {
                timeLeftElement.textContent = `${hours}h ${minutes}min`;
            } else {
                timeLeftElement.textContent = `${minutes}min`;
            }
        }
    }

    update();
    setInterval(update, 1000);
}


// ***************************** Catégorie avec filtre marques et 3 produits aléatoires (universelle) ****************************

function shuffleAndLimit(array, limit = 4) {
    return array.sort(() => Math.random() - 0.5).slice(0, limit);
}

async function loadCombinedCategoryProducts(slugs, containerId, filtersContainerId) {
    try {
        // --- Récupérer tous les produits de toutes les catégories ---
        const fetches = slugs.map(slug => fetch(`${API}/categories/category/${slug}`).then(r => r.json()));
        const results = await Promise.all(fetches);

        // Fusionner tous les produits en un seul array
        const products = results.flatMap(res => Array.isArray(res) ? res : res.data || []);

        const container = document.getElementById(containerId);
        const filtersContainer = document.getElementById(filtersContainerId);
        if (!container || !filtersContainer) return;

        const isSlick = container.classList.contains("js-slick-carousel");

        // --- Si c'est un carrousel Slick, on le désinitialise proprement ---
        if (isSlick && $(container).hasClass('slick-initialized')) {
            $(container).slick('unslick');
        }

        // --- Extraire les brands uniques ---
        const brandsSet = new Set(products.map(p => p.brand?.name).filter(Boolean));
        const brands = ["Top 10", ...brandsSet];

        // --- Générer les onglets ---
        filtersContainer.innerHTML = brands.map(brand => `
            <li class="nav-item flex-shrink-0 flex-md-shrink-1">
                <a href="#" class="nav-link ${brand === "Top 10" ? "active btn btn-outline-primary border-width-2 rounded-pill py-1 px-4 font-size-15 text-lh-19 font-size-15-md" : "text-gray-8"}" data-brand="${brand}">
                    <div class="d-md-flex justify-content-md-center align-items-md-center">
                        ${brand}
                    </div>
                </a>
            </li>
        `).join("");

        // --- Fonction pour afficher les produits filtrés ---
        function displayProducts(filteredProducts) {
            // Les filtres remplacent les slides : détruire Slick avant de toucher au DOM.
            destroySlick(container);
            container.innerHTML = "";

            const productsToShow = shuffleAndLimit(filteredProducts, 4);

            if (isSlick) {
                // --- Créer les slides un par un ---
                productsToShow.forEach(p => {
                    const slide = document.createElement('div');
                    slide.className = 'js-slide products-group';
                    
                    const img = p.images?.find(i => i.is_main)?.image_url?.replace(/\\/g, "/") || "placeholder.jpg";
                    const price = p.prices?.[0]?.price || 0;
                    const categoryName = p.category?.name || "";
                    const prodSlug = p.slug || p.id || "";
                    const url = `/single-product?slug=${prodSlug}`;

                    // ✅ Utilisation du helper pour le prix
                    const priceHtml = formatProductPrice(price, p.promo);

                    slide.innerHTML = `
                        <div class="product-item">
                            <div class="product-item__outer h-100 w-100">
                                <div class="product-item__inner px-wd-4 p-2 p-md-3">
                                    <div class="product-item__body pb-xl-2">
                                        <div class="mb-2"><a href="/category-slug?slug=${p.category?.slug}" class="font-size-12 text-gray-5">${categoryName}</a></div>
                                        <h5 class="mb-1 product-item__title">
                                            <a href="${url}" class="text-blue font-weight-bold">${p.name}</a>
                                        </h5>
                                        <div class="mb-2 product-images-wrapper">
                                            <a href="${url}" class="d-block text-center">
                                                <img class="img-fluid img-212x200 main-img" src="${API}/${img}" alt="" loading="lazy" decoding="async">
                                            </a>
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
                                </div>
                            </div>
                        </div>
                    `;
                    
                    container.appendChild(slide);
                });

                initProductCarousel(container, 4);
                
            } else {
                // --- HTML Liste classique ---
                productsToShow.forEach(p => {
                    const li = document.createElement('li');
                    li.className = 'col-6 col-md-4 col-wd-3 product-item';
                    
                    const img = p.images?.find(i => i.is_main)?.image_url?.replace(/\\/g, "/") || "placeholder.jpg";
                    const price = p.prices?.[0]?.price || 0;
                    const categoryName = p.category?.name || "";
                    const prodSlug = p.slug || p.id || "";
                    const url = `/single-product?slug=${prodSlug}`;

                    // ✅ Utilisation du helper pour le prix
                    const priceHtml = formatProductPrice(price, p.promo);

                    li.innerHTML = `
                        <div class="product-item__outer h-100 w-100">
                            <div class="product-item__inner px-xl-4 p-3">
                                <div class="product-item__body pb-xl-2">
                                    <div class="mb-2"><a href="/category-slug?slug=${p.category?.slug}" class="font-size-12 text-gray-5">${categoryName}</a></div>
                                    <h5 class="mb-1 product-item__title">
                                        <a href="${url}" class="text-blue font-weight-bold">${p.name}</a>
                                    </h5>
                                    <div class="mb-2 product-images-wrapper">
                                        <a href="${url}" class="d-block text-center">
                                            <img class="img-fluid main-img" src="${API}/${img}" alt="" loading="lazy" decoding="async">
                                        </a>
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
                            </div>
                        </div>
                    `;
                    
                    container.appendChild(li);
                });
            }
        }

        // --- Afficher Top 10 par défaut ---
        displayProducts(products);

        // --- Événements de filtre par brand ---
        filtersContainer.querySelectorAll("a[data-brand]").forEach(a => {
            a.addEventListener("click", e => {
                e.preventDefault();
                filtersContainer.querySelectorAll("a").forEach(b => b.classList.remove("active", "btn", "btn-outline-primary", "rounded-pill"));
                a.classList.add("active", "btn", "btn-outline-primary", "rounded-pill");

                const brand = a.getAttribute("data-brand");
                if (brand === "Top 10") {
                    displayProducts(products);
                } else {
                    const filtered = products.filter(p => p.brand?.name === brand);
                    displayProducts(filtered);
                }
            });
        });

    } catch (err) {
        console.error("Erreur catégories combinées", slugs, err);
    }
}

// *************************** IMPRIMANTES & SCANNERS ****************************** 

async function loadPrintersScannersSlider() {
    try {
        // --- Récupérer tous les produits des deux catégories ---
        const slugs = ["imprimante", "scanner"];
        const fetches = slugs.map(slug => fetch(`${API}/categories/category/${slug}`).then(r => r.json()));
        const results = await Promise.all(fetches);

        // Fusionner les produits
        const products = results.flatMap(res => Array.isArray(res) ? res : res.data || []);

        const container = document.getElementById("category-printers");
        if (!container) return;

        destroySlick(container);
        container.innerHTML = ""; // Vider l'ancien contenu

        // --- Créer chaque slide ---
        products.forEach(p => {
            const img = p.images?.find(i => i.is_main)?.image_url?.replace(/\\/g, "/") || "placeholder.jpg";
            const price = p.prices?.[0]?.price || 0;
            const categoryName = p.category?.name || "";
            const catId = p.category?.id || "";
            const catSlug = p.category?.slug || "";
            const prodSlug = p.slug || p.id || "";
            const url = `/single-product?slug=${prodSlug}`|| `/single-product?id=${p.id}`;

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
                                    <h5 class="mb-1 product-item__title"><a href="${url}" class="text-blue font-weight-bold">${p.name}</a></h5>
                                    <div class="mb-2 product-images-wrapper">
                                        <a href="${url}" class="d-block text-center"><img class="img-fluid img-212X305 main-img" src="${API}/${img}" alt="${p.name}" loading="lazy" decoding="async"></a>
                                    </div>
                                    
                                    
                                    <div class="banner-overlay"></div>
                                    <div class="flex-center-between mb-1">
                                        <div class="prodcut-price">
                                            ${priceHtml}
                                        </div>
                                        <div class="d-none d-xl-block prodcut-add-cart">
                                            <a href="${url}" class="btn-add-cart btn-primary transition-3d-hover"><i class="ec ec-add-to-cart"></i></a>
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

        initProductCarousel(container, parseInt(container.dataset.slidesShow || "4", 10));

    } catch (err) {
        console.error("Erreur chargement slider imprimantes + scanners", err);
    }
}

// *************************** Meuilleure vente ******************************

// --- API calls ---
async function fetchTopRated() {
    const res = await fetch(`${API}/products/top-rated`);
    return await res.json();
}

async function fetchByCategory(slug) {
    const res = await fetch(`${API}/categories/category/${slug}`);
    return await res.json();
}

// --- Render products ---
async function loadProduct(products) {
    const carousel = document.querySelector("#best-sellers");
    if (!carousel) {
        console.warn("⚠️ Container #best-sellers introuvable !");
        return;
    }

    carousel.innerHTML = "";

    // --- Normaliser en array ---
    if (!Array.isArray(products)) {
        if (products && Array.isArray(products.data)) {
            products = products.data;
        } else {
            console.warn("⚠️ Les produits reçus ne sont pas un array :", products);
            products = [];
        }
    }

    // --- Limiter à 3 produits max ---
    products = products.slice(0, 3);

    if (!products.length) {
        console.warn("⚠️ Aucun produit à afficher !");
        return;
    }

    const slide = document.createElement("div");
    slide.className = "js-slide";

    const ul = document.createElement("ul");
    ul.className = "row list-unstyled products-group no-gutters mb-0 overflow-visible";

    products.forEach(p => {
        const img = p.images?.find(i => i.is_main)?.image_url?.replace(/\\/g, "/") || "";
        const price = p.prices?.[0]?.price || 0;
        const prodSlug = p.slug || p.id || "";
        const url = `/single-product?slug=${prodSlug}` || `/single-product?id=${p.id}`;
        const priceHtml = formatProductPrice(price, p.promo);

        ul.innerHTML += `
        <li class="col-md-4 product-item product-item__card pb-2 mb-2">
            <div class="product-item__outer h-100 w-100">
                <div class="product-item__inner p-md-3 row no-gutters">
                    <div class="col col-lg-auto col-xl-5 product-media-left main-img">
                        <a href="${url}" class="d-block">
                            <img class="img-fluid product-img" src="${API}/${img}" alt="${p.name}" loading="lazy" decoding="async">
                        </a>
                    </div>
                    <div class="banner-overlay"></div>
                    <div class="col product-item__body pl-3">
                        <div class="mb-2 text-gray-5">${p.category?.name || ""}</div>
                        <h5 class="product-item__title text-blue font-weight-bold">${p.name}</h5>
                        <div class="flex-center-between mb-3 text-gray-100">
                            <div class="prodcut-price">${priceHtml}</div>
                            <div class="d-none d-xl-block prodcut-add-cart">
                                <a href="${url}" class="btn-add-cart btn-primary transition-3d-hover">
                                    <i class="ec ec-add-to-cart"></i>
                                </a>
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
        </li>`;
    });

    slide.appendChild(ul);
    carousel.appendChild(slide);

    refreshSlick(carousel);
}

// --- Slick refresh ---
function refreshSlick(carouselEl) {
    if (!carouselEl || !window.jQuery || !jQuery.fn.slick) return;

    const $carousel = jQuery(carouselEl);

    if ($carousel.hasClass("slick-initialized")) {
        $carousel.slick("setPosition");
    } else {
        $carousel.slick({
            slidesToShow: 3,   // ⚡ Desktop : 3 produits
            slidesToScroll: 1,
            arrows: true,
            dots: true,
            adaptiveHeight: true,
            responsive: [
                {
                    breakpoint: 992, // tablette
                    settings: { slidesToShow: 2 }
                },
                {
                    breakpoint: 576, // mobile
                    settings: { slidesToShow: 2 } // ⚡ aussi 2 en mobile
                }
            ]
        });
    }
}

// --- Loaders ---
async function loadTop() {
    const products = await fetchTopRated();
    await loadProduct(products.data || products); // ⚡ correction
}

async function loadBySlugs(slugs) {
    const list = [];
    for (const slug of slugs) {
        const data = await fetchByCategory(slug.trim());
        list.push(...(data.data || data)); // ⚡ correction
    }
    await loadProduct(list);
}

// *************************** LATEST ******************************

async function loadLatestProducts() {
    try {
        const res = await fetch(`${API}/products/latest`);
        if (!res.ok) throw new Error("Erreur lors du chargement des derniers produits");

        let products = await res.json();

        // Limiter à 10 produits
        products = products.slice(0, 10);

        const container = document.querySelector(".js-slick-carousel.u-slick--gutters-2");
        if (!container) return;

        container.innerHTML = ""; // vider le contenu statique

        // Chaque slide = 3 produits regroupés
        for (let i = 0; i < products.length; i += 3) {
            const slide = document.createElement("div");
            slide.classList.add("js-slide");

            const group = document.createElement("ul");
            group.classList.add("list-unstyled", "products-group", "mb-0", "overflow-visible");

            products.slice(i, i+3).forEach(p => {
                const img = p.images?.find(i => i.is_main)?.image_url?.replace(/\\/g, "/") || "placeholder.jpg";
                const price = p.prices?.[0]?.price || 0;
                const prodSlug = p.slug || p.id || "";
                const url = `/single-product?slug=${prodSlug}`|| `/single-product?id=${p.id}`;

                // ✅ Utilisation du helper pour le prix
                const priceHtml = formatProductPrice(price, p.promo);

                group.innerHTML += `
                    <li class="product-item__list pb-2 mb-2 pb-md-0 mb-md-0">
                        <div class="product-item__outer h-100">
                            <div class="product-item__inner py-md-3 mx-3 border-bottom row no-gutters">
                                <div class="col-auto product-media-left">
                                    <a href="${url}" class="max-width-70 d-block">
                                        <img class="img-fluid" src="${API}/${img}" alt="${p.name}" loading="lazy" decoding="async">
                                    </a>
                                </div>
                                <div class="col product-item__body pl-2 pl-lg-3">
                                    <div class="mb-4">
                                        <h5 class="product-item__title">
                                            <a href="${url}" class="text-gray-90">${p.name}</a>
                                        </h5>
                                    </div>
                                    <div class="flex-center-between">
                                        <div class="prodcut-price">
                                            <div class="text-gray-100 font-size-15 font-weight-bold">
                                                ${priceHtml}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </li>
                `;
            });

            slide.appendChild(group);
            container.appendChild(slide);
        }

        // Réinitialiser Slick
        const $container = $(container);
        if ($container.hasClass("slick-initialized")) {
            $container.slick("unslick");
        }
        $container.slick({
            slidesToShow: parseInt(container.dataset.slidesShow) || 1,
            slidesToScroll: parseInt(container.dataset.slidesScroll) || 1,
            arrows: true,
            dots: true,
            appendDots: $container.closest(".position-relative").find(".u-slick__pagination"),
            prevArrow: `<i type="button" class="slick-prev ${container.dataset.arrowsClasses} ${container.dataset.arrowLeftClasses}"></i>`,
            nextArrow: `<i type="button" class="slick-next ${container.dataset.arrowsClasses} ${container.dataset.arrowRightClasses}"></i>`
        });

    } catch (err) {
        console.error("Erreur chargement Latest Products:", err);
    }
}

// *************************** ASIDE FEATURED ******************************

async function loadFeaturedProductsAside() {
    try {
        const res = await fetch(`${API}/products/featured`);
        if (!res.ok) throw new Error("Erreur chargement Featured Products");

        let products = await res.json();
        products = products.slice(0, 10); // limite à 10 produits

        const container = document.getElementById("featured-products");
        if (!container) return;

        container.innerHTML = "";

        products.forEach(p => {
            const img = p.images?.find(i => i.is_main)?.image_url?.replace(/\\/g, "/") 
                    || "placeholder.jpg";
            const price = p.prices?.[0]?.price || 0;
            
            const categoryName = p.category?.name || "";

            // ✅ Utilisation du helper pour le prix
            const priceHtml = formatProductPrice(price, p.promo);

            const slide = document.createElement("div");
            slide.classList.add("js-slide", "products-group");

            slide.innerHTML = `
                <div class="product-item remove-divider text-center">
                    <div class="product-item__outer h-100">
                        <div class="product-item__inner remove-prodcut-hover px-wd-4 p-2 p-md-3">
                            <div class="product-item__body pb-xl-2">
                                <div class="mb-2">
                                    <a href="/single-product?id=${p.id}" class="d-block text-center">
                                        <img class="img-fluid" src="${API}/${img}" alt="${p.name}" loading="lazy" decoding="async">
                                    </a>
                                </div>
                                <div class="mb-2">
                                    <a href="/category-slug?slug=${p.category?.slug}" class="font-size-12 text-gray-5">${categoryName}</a>
                                </div>
                                <h5 class="mb-4 product-item__title">
                                    <a href="/single-product?id=${p.id}" class="text-blue font-weight-bold">${p.name}</a>
                                </h5>
                                <div class="mb-1">
                                    <div class="prodcut-price">
                                        ${priceHtml}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;
            container.appendChild(slide);
        });

        const $container = $(container);
        if ($container.hasClass("slick-initialized")) {
            $container.slick("unslick");
        }

        $container.slick({
            slidesToShow: parseInt(container.dataset.slidesShow) || 1,
            slidesToScroll: parseInt(container.dataset.slidesScroll) || 1,
            arrows: true,
            dots: true,
            appendDots: $container.closest(".position-relative").find(".u-slick__pagination"),
            prevArrow: `<i class="slick-prev ${container.dataset.arrowsClasses} ${container.dataset.arrowLeftClasses}"></i>`,
            nextArrow: `<i class="slick-next ${container.dataset.arrowsClasses} ${container.dataset.arrowRightClasses}"></i>`
        });

    } catch (err) {
        console.error("Erreur Featured Products:", err);
    }
}

// *************************** Blog ******************************

async function loadLatestBlogs() {
    try {
        const res = await fetch(`${API}/blog/latest`);
        if (!res.ok) throw new Error("Erreur chargement Blogs");

        let blogs = await res.json();
        blogs = blogs.slice(0, 10); // limite à 10 articles

        const container = document.getElementById("latest-blogs");
        if (!container) return;

        container.innerHTML = "";

        blogs.forEach(b => {
            const img = b.image?.replace(/\\/g, "/") || "placeholder.jpg";
            const categoryName = b.category?.name || "";
            const commentsCount = b.comments_count || 0;

            const slide = document.createElement("div");
            slide.classList.add("js-slide", "post-group");

            slide.innerHTML = `
                <div class="post-item">
                    <div class="product-item__body pb-xl-2">
                        <div class="mb-3">
                            <a href="/blog/${b.slug}" class="d-block text-center">
                                <img class="img-fluid" src="${API}/${img}" alt="${b.title}" loading="lazy" decoding="async">
                            </a>
                        </div>
                        <div class="mb-1">
                            <a href="/category/${b.category?.slug}" class="font-size-12 text-gray-5">${categoryName}</a>
                        </div>
                        <h6 class="mb-2 post-item__title font-size-14">
                            <a href="/blog/${b.slug}" class="font-weight-bold text-dark">${b.title}</a>
                        </h6>
                        <div class="mb-1">
                            <a href="/blog/${b.slug}" class="d-block text-gray-5">
                                <i class="ec ec-comment"></i> ${commentsCount}
                            </a>
                        </div>
                    </div>
                </div>`;
            container.appendChild(slide);
        });

        const $container = $(container);
        if ($container.hasClass("slick-initialized")) {
            $container.slick("unslick");
        }

        $container.slick({
            slidesToShow: parseInt(container.dataset.slidesShow) || 1,
            slidesToScroll: parseInt(container.dataset.slidesScroll) || 1,
            arrows: true,
            dots: true,
            appendDots: $container.closest(".position-relative").find(".u-slick__pagination"),
            prevArrow: `<i class="slick-prev ${container.dataset.arrowsClasses} ${container.dataset.arrowLeftClasses}"></i>`,
            nextArrow: `<i class="slick-next ${container.dataset.arrowsClasses} ${container.dataset.arrowRightClasses}"></i>`
        });

    } catch (err) {
        console.error("Erreur Blogs:", err);
    }
}

// *************************** BIG SHOP ****************************

// ===============================================
// CHARGEMENT PRODUITS PAR MARQUES (BESTSELLERS)
// ===============================================

async function loadBestsellersByBrands(slugs, containerPrefix) {
    try {
        console.log(`🔍 Chargement des catégories: ${slugs.join(', ')}`);
        
        // --- Récupérer tous les produits des catégories spécifiées ---
        const fetches = slugs.map(slug => fetch(`${API}/categories/category/${slug}`).then(r => r.json()));
        const results = await Promise.all(fetches);

        // Fusionner tous les produits en un seul array
        let products = results.flatMap(res => Array.isArray(res) ? res : res.data || []);
        
        // 🔍 DEBUG : Voir les marques des produits
        console.log("📊 Produits avec marques:", products.map(p => ({
            name: p.name,
            brand: p.brand?.name
        })));
        
        // Mélanger tous les produits pour un affichage aléatoire
        products = shuffleArray(products);
        
        console.log(`📦 ${products.length} produits chargés au total`);

        // --- Extraire les marques uniques de tous les produits ---
        const brandsSet = new Set(products.map(p => p.brand?.name).filter(Boolean));
        const brands = ["Top 10", ...brandsSet];
        console.log("🏷️ Marques disponibles:", brands);
        console.log("🔍 Détail des marques extraites:", Array.from(brandsSet));

        // Si aucune marque n'est trouvée
        if (brandsSet.size === 0) {
            console.warn("⚠️ Aucune marque trouvée dans les produits");
        }

        // --- Récupérer les conteneurs des 4 onglets ---
        const tabContents = [
            document.querySelector("#bestsellers-grid-1"),
            document.querySelector("#bestsellers-grid-2"),
            document.querySelector("#bestsellers-grid-3"),
            document.querySelector("#bestsellers-grid-4")
        ];
        
        const sideContents = [
            document.querySelector("#bestsellers-featured-1"),
            document.querySelector("#bestsellers-featured-2"),
            document.querySelector("#bestsellers-featured-3"),
            document.querySelector("#bestsellers-featured-4")
        ];

        // Vérifier que tous les conteneurs existent
        if (tabContents.some(el => !el) || sideContents.some(el => !el)) {
            console.error("❌ Conteneurs non trouvés", { tabContents, sideContents });
            return;
        }

        // --- Générer les onglets de filtres ---
        const filtersContainer = document.querySelector("#bestsellers-filters");
        if (filtersContainer) {
            filtersContainer.innerHTML = brands.map((brand, index) => `
                <li class="nav-item flex-shrink-0 flex-lg-shrink-1">
                    
                    <a class="nav-link rounded-pill ${index === 0 ? 'active' : ''}" 
                       id="brand-${brand.replace(/\s+/g, '')}-tab" 
                       data-toggle="pill" 
                       href="#brand-${brand.replace(/\s+/g, '')}" 
                       role="tab" 
                       data-brand="${brand}">
                        <div class="d-md-flex justify-content-md-center align-items-md-center">
                            ${brand}
                        </div>
                    </a>
                </li>
            `).join("");
            
            console.log("✅ Filtres générés avec", brands.length, "marques");
        } else {
            console.error("❌ Conteneur de filtres #bestsellers-filters non trouvé");
        }

        // --- Fonction pour afficher les produits filtrés ---
        function displayProductsForBrand(brand) {
            console.log(`🎯 Filtrage par marque: ${brand}`);
            
            let filteredProducts;
            if (brand === "Top 10") {
                filteredProducts = products;
                console.log(`📊 Top 10: ${filteredProducts.length} produits (tous)`);
            } else {
                filteredProducts = products.filter(p => p.brand?.name === brand);
                console.log(`📊 ${brand}: ${filteredProducts.length} produits trouvés`);
            }
            
            // 🔥 LIMITE : Maximum 16 produits (2 lignes de 8)
            const MAX_PRODUCTS = 8;
            let productsToShow = filteredProducts;
            let showViewMore = false;
            
            if (filteredProducts.length > MAX_PRODUCTS) {
                productsToShow = filteredProducts.slice(0, MAX_PRODUCTS);
                showViewMore = true;
                console.log(`📏 Limité à ${MAX_PRODUCTS} produits (${filteredProducts.length - MAX_PRODUCTS} supplémentaires masqués)`);
            }
            
            // Identifier l'onglet actif
            let activeTabIndex = 0;
            for (let i = 0; i < 4; i++) {
                const tabPane = tabContents[i]?.closest('.tab-pane');
                if (tabPane && tabPane.classList.contains('show')) {
                    activeTabIndex = i;
                    break;
                }
            }
            
            console.log(`🔍 Onglet actif: ${activeTabIndex + 1}`);
            
            // Vider TOUS les conteneurs
            for (let i = 0; i < 4; i++) {
                if (tabContents[i]) tabContents[i].innerHTML = "";
                if (sideContents[i]) sideContents[i].innerHTML = "";
            }
            
            // Mettre les produits dans l'onglet actif
            const activeTabContent = tabContents[activeTabIndex];
            const activeSideContent = sideContents[activeTabIndex];
            
            if (!activeTabContent || !activeSideContent) {
                console.error("❌ Conteneur de l'onglet actif non trouvé");
                return;
            }
            
            // Afficher les produits dans la grille principale
            productsToShow.forEach(product => {
                const li = createBestsellerProductItem(product);
                activeTabContent.appendChild(li);
            });
            
            // 🔥 Bouton "Voir plus" si nécessaire
            
            
            // Produit vedette (premier produit)
            if (filteredProducts.length > 0) {
                const featuredProduct = filteredProducts[0];
                const featuredLi = createBestsellerFeaturedItem(featuredProduct);
                activeSideContent.appendChild(featuredLi);
            }
            
            console.log(`✅ ${productsToShow.length} produits affichés dans l'onglet ${activeTabIndex + 1}`);
        }

        // --- Afficher "Top 10" par défaut ---
        displayProductsForBrand("Top 10");

        // --- Ajouter les événements de clic sur les onglets ---
        document.querySelectorAll('#bestsellers-filters a[data-brand]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const brand = link.getAttribute('data-brand');
                displayProductsForBrand(brand);
                
                // Gérer l'activation des onglets
                document.querySelectorAll('#bestsellers-filters a').forEach(l => {
                    l.classList.remove('active');
                });
                link.classList.add('active');
            });
        });

    } catch (err) {
        console.error("❌ Erreur chargement bestsellers:", err);
    }
}

// --- Fonction pour créer un élément produit dans la grille ---
function createBestsellerProductItem(product) {
    const img = product.images?.find(i => i.is_main)?.image_url?.replace(/\\/g, "/") || "placeholder.jpg";
    const price = product.prices?.[0]?.price || 0;
    const categoryName = product.category?.name || "";
    const prodSlug = product.slug || product.id || "";
    const url = `/single-product?slug=${prodSlug}`;

    // ✅ Utilisation du helper pour le prix
    const priceHtml = formatProductPrice(price, product.promo);

    const li = document.createElement("li");
    li.className = "col-md-6 col-lg-4 col-wd-3 product-item remove-divider";
    
    li.innerHTML = `
        <div class="product-item__outer h-100 w-100 prodcut-box-shadow">
            <div class="product-item__inner bg-white p-3">
                <div class="product-item__body pb-xl-2">
                    <div class="mb-2">
                        <a href="/category-slug?slug=${product.category?.slug}" class="font-size-12 text-gray-5">${categoryName}</a>
                    </div>
                    <h5 class="mb-1 product-item__title">
                        <a href="${url}" class="text-blue font-weight-bold">${product.name}</a>
                    </h5>
                    <div class="mb-2">
                        <a href="${url}" class="d-block text-center product-images-wrapper ">
                            <img class="img-fluid main-img" src="${API}/${img}" alt="${product.name}" loading="lazy" decoding="async">
                        </a>
                    </div>
                    <div class="flex-center-between mb-1">
                        <div class="prodcut-price">
                            ${priceHtml}
                        </div>
                       
                    </div>
                </div>
                <div class="product-item__footer">
                    <div class="border-top pt-2 flex-center-between flex-wrap">
                       
                        <a href="#" class="text-gray-6 font-size-13 wishlist-btn" data-id="${product.id}">
                            <i class="ec ec-favorites mr-1 font-size-15"></i> Wishlist
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return li;
}

// --- Fonction pour créer l'élément produit en vedette ---
function createBestsellerFeaturedItem(product) {
    const img = product.images?.find(i => i.is_main)?.image_url?.replace(/\\/g, "/") || "placeholder.jpg";
    const price = product.prices?.[0]?.price || 0;
    const prodSlug = product.slug || product.id || "";
    const url = `/single-product?slug=${prodSlug}`;

    // ✅ Utilisation du helper pour le prix
    const priceHtml = formatProductPrice(price, product.promo);

    const li = document.createElement("li");
    li.className = "col product-item remove-divider";
    
    li.innerHTML = `
        <div class="product-item__outer h-100 w-100 prodcut-box-shadow">
            <div class="product-item__inner bg-white p-3">
                <div class="product-item__body d-flex flex-column">
                    <div class="mb-1">
                        <div class="mb-2">
                            <a href="/category-slug?slug=${product.category?.slug}" class="font-size-12 text-gray-5">${product.category?.name || 'Catégorie'}</a>
                        </div>
                        <h5 class="mb-0 product-item__title">
                            <a href="${url}" class="text-blue font-weight-bold">${product.name}</a>
                        </h5>
                    </div>
                    <div class="mb-1 min-height-8-1 ">
                        <a href="${url}" class="d-block text-center my-4 mt-lg-6 mb-xl-5 mb-lg-0 mt-xl-0 mb-xl-0 mt-wd-6 mb-wd-5">
                            <img class="img-fluid main-img" src="${API}/${img}" alt="${product.name}" loading="lazy" decoding="async">
                        </a>
                        <!-- Gallery avec miniatures -->
                        <div class="row mx-gutters-2 mb-3">
                            ${product.images?.slice(0, 3).map((img, idx) => `
                                <div class="col-auto">
                                    <a class="js-fancybox max-width-60 u-media-viewer" href="javascript:;"
                                       data-src="${API}/${img.image_url}"
                                       data-fancybox="fancyboxGallery${product.id}"
                                       data-caption="${product.name} - image #${idx+1}"
                                       data-speed="700">
                                        <img class="img-fluid border" src="${API}/${img.image_url}" alt="" loading="lazy" decoding="async">
                                        <span class="u-media-viewer__container">
                                            <span class="u-media-viewer__icon">
                                                <span class="fas fa-plus u-media-viewer__icon-inner"></span>
                                            </span>
                                        </span>
                                    </a>
                                </div>
                            `).join('')}
                            <div class="col"></div>
                        </div>
                    </div>
                    <div class="flex-center-between">
                        <div class="prodcut-price">
                            ${priceHtml}
                        </div>
                        <a href="${url}" class="btn-prestige-3d">
                            <i class="ec ec-add-to-cart"></i>
                            <span>Ajouter au panier</span>
                        </a>
                    </div>
                </div>
                <div class="product-item__footer">
                    <div class="border-top pt-2 flex-center-between flex-wrap">
                       
                        <a href="#" class="text-gray-6 font-size-13 wishlist-btn" data-id="${product.id}">
                            <i class="ec ec-favorites mr-1 font-size-15"></i> Wishlist
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return li;
}

// --- Fonction utilitaire pour mélanger un tableau ---
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}


// --- Au démarrage ---
document.addEventListener("DOMContentLoaded", () => {
    loadProducts("featured", "pills-one-example1");
    loadProducts("on-sale", "pills-two-example1");
    loadProducts("top-rated", "pills-three-example1");
    loadFeaturedBanner();
    loadDeals();

    // Smartphones (une seule catégorie)
    loadCombinedCategoryProducts(["smartphones"], "category-smartphones", "category-smartphones-filters");

    // Projecteurs + Smart TV
    loadCombinedCategoryProducts(["projecteur", "smart-tv"], "category-tv-projectors", "category-tv-projectors-filters");

    // Accessoires (une seule catégorie)
    loadCombinedCategoryProducts(
        ["accesoires-info", "smartphones-accesoires", "tablettes-accesoires", "accesoires-o-v"],
        "category-accessories",
        "category-accessories-filters"
    );

    loadBestsellersByBrands(["onduleurs", "batterie-onduleurs", "reseaux", "switch", "routeur", "accessoires-reseaux"], "bestsellers");

    loadPrintersScannersSlider();

    loadLatestProducts();

    loadFeaturedProductsAside();

    loadLatestBlogs();



    // --- Charger Top 10 au démarrage ---

});

// gestion onglets
document.querySelectorAll(".nav-pills a").forEach(btn => {
    btn.addEventListener("click", async e => {
        e.preventDefault();

        document.querySelectorAll(".nav-pills a").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        if (btn.dataset.type === "top") {
            loadTop();
        } else if (btn.dataset.slug) {
            const slugs = btn.dataset.slug.split(",");
            loadBySlugs(slugs);
        }
    });
});

// chargement initial
document.addEventListener("DOMContentLoaded", loadTop);

