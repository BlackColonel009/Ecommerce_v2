function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

async function loadCategories() {
    try {
        const res = await fetch(`${API}/categories`, { credentials: "include" });
        let categories = await res.json();

        console.log("[loadCategories] Catégories reçues:", categories);

        // Mélanger les catégories avant affichage
        categories = shuffleArray(categories);

        const container = document.querySelector(".products-group"); // ton UL
        if (!container) {
            console.error("[loadCategories] Container .products-group introuvable");
            return;
        }

        container.innerHTML = ""; // reset avant injection

        categories.forEach(cat => {
            const li = document.createElement("li");
            li.classList.add("col-6", "col-md-2gdot4", "product-item");

            li.innerHTML = `
                <div class="product-item__outer h-100 w-100">
                    <div class="product-item__inner px-xl-4 p-3">
                        <div class="product-item__body pb-xl-2">
                            <div class="mb-2 product-images-wrapper">
                                <a href="/category-slug?slug=${cat.slug}" class="d-block text-center">
                                    <img class="img-fluid main-img"
                                         src="${API}/${cat.image_url || 'uploads/products/demo-placeholders/demo-accessory.webp'}"
                                         alt="${cat.name}" loading="lazy" decoding="async">
                                </a>
                            </div>
                            <div class="banner-overlay"></div>
                            <h5 class="text-center mb-1 product-item__title">
                                <a href="/category-slug?slug={cat.slug}" class="font-size-15 text-gray-90">
                                    ${cat.name}
                                </a>
                            </h5>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(li);
        });
    } catch (err) {
        console.error("[loadCategories] Erreur:", err);
    }
}

document.addEventListener("DOMContentLoaded", loadCategories);


// --------------------------------------------------------------
// Plus vendue 
// --------------------------------------------------------------

async function loadFProducts() {
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
            const formattedPrice = price.toLocaleString("fr-FR");
            const categoryName = p.category?.name || "";
            const catSlug = p.category?.slug || "";
            const prodSlug = p.slug || p.id;
            const url = `/single-product?slug=${prodSlug}` || `/single-product?id=${p.id}`;

            // ✅ Utilisation du helper pour le prix
            const priceHtml = formatProductPrice(price, p.promo);

            const slide = document.createElement("div");
            slide.classList.add("js-slide");

            slide.innerHTML = `
                <div class="product-item product-item__card pb-2 mb-2 border-bottom border-md-bottom-0">
                    <div class="product-item__outer h-100 w-100">
                        <div class="product-item__inner p-md-3 row no-gutters">
                            <div class="col col-lg-auto product-media-left product-images-wrapper">
                                <a href="${url}" class="max-width-150 d-block">
                                    <img class="img-fluid main-img" src="${API}/${img}" alt="${p.name}">
                                </a>
                            </div>
                            <div class="banner-overlay"></div>
                            <div class="col product-item__body pl-2 pl-lg-3 mr-xl-2 mr-wd-1">
                                <div class="mb-4">
                                    <div class="mb-2">
                                        <a href="/category-slug?slug=${catSlug}" class="font-size-12 text-gray-5">${categoryName}</a>
                                    </div>
                                    <h5 class="product-item__title">
                                        <a href="${url}" class="text-blue font-weight-bold">${p.name}</a>
                                    </h5>
                                </div>
                                <div class="flex-center-between mb-3">
                                    <div class="prodcut-price">
                                        ${priceHtml}
                                    </div>
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
                </div>`;
            container.appendChild(slide);
        });

        const $container = $(container);
        if ($container.hasClass("slick-initialized")) {
            $container.slick("unslick");
        }

        $container.slick({
            slidesToShow: parseInt(container.dataset.slidesShow) || 3,
            slidesToScroll: parseInt(container.dataset.slidesScroll) || 1,
            arrows: true,
            dots: true,
            appendDots: $container.closest(".position-relative").find(".u-slick__pagination"),
            prevArrow: `<i class="slick-prev ${container.dataset.arrowsClasses} ${container.dataset.arrowLeftClasses}"></i>`,
            nextArrow: `<i class="slick-next ${container.dataset.arrowsClasses} ${container.dataset.arrowRightClasses}"></i>`,
            responsive: JSON.parse(container.dataset.responsive || "[]")
        });

    } catch (err) {
        console.error("Erreur Featured Products:", err);
    }
}

document.addEventListener("DOMContentLoaded", loadFProducts);

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

// ------------------------------------------------------------------------
// plus vendu dans ces catégories
// ------------------------------------------------------------------------


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
                prevArrow: `<button type="button" class="${container.dataset.arrowLeftClasses}"></button>`,
                nextArrow: `<button type="button" class="${container.dataset.arrowRightClasses}"></button>`,
                responsive: JSON.parse(container.dataset.responsive || "[]")
            });
        }

    } catch (err) {
        console.error("Erreur chargement slider imprimantes + scanners", err);
    }
}


document.addEventListener("DOMContentLoaded", () => {
    console.log("📦 DOMContentLoaded");

    loadLatestProducts();
    // Imprimantes + Scanners
    loadrelatedinthiscategory();
});
