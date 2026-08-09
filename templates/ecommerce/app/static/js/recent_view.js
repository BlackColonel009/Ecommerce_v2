// -----------------------------
// Récupérer l'ID produit à partir du slug
// -----------------------------
async function getProductIdFromSlug(slug) {
    try {
        const res = await fetch(`${API}/products/slug/${slug}`);
        if (!res.ok) throw new Error(`Erreur HTTP: ${res.status}`);
        const product = await res.json();
        return product.id;
    } catch (error) {
        console.error("❌ Erreur getProductIdFromSlug:", error);
        return null;
    }
}

// -----------------------------
// Ajouter une vue récente
// -----------------------------
async function addRecentView(productId) {
    if (!productId) {
        console.warn("⚠️ addRecentView appelé sans productId");
        return;
    }
    
    try {
        const res = await fetch(`${API}/recent/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ product_id: parseInt(productId) }),
            credentials: "include" 
        });
        
        if (!res.ok) {
            const error = await res.text();
            console.error("❌ Erreur API recent:", error);
            return;
        }
        
        const data = await res.json();
        console.log("[addRecentView] ✅ Vue ajoutée:", data);
    } catch (err) {
        console.error("[addRecentView] ❌ Erreur réseau:", err);
    }
}

// -----------------------------
// Récupérer les vues récentes
// -----------------------------
async function fetchRecentViews() {
    try {
        const res = await fetch(`${API}/recent`, {
            method: "GET",
            credentials: "include"   
        });
        
        if (!res.ok) {
            console.error("❌ Erreur fetchRecentViews:", res.status);
            return [];
        }
        
        const data = await res.json();
        console.log("[fetchRecentViews] ✅", data.length, "produits récents");
        return data;
    } catch (err) {
        console.error("[fetchRecentViews] ❌ Erreur:", err);
        return [];
    }
}

// -----------------------------
// Extraire l'ID produit depuis l'URL (slug ou id)
// -----------------------------
async function extractProductIdFromUrl(href) {
    const url = new URL(href, window.location.origin);
    
    // 1️⃣ Essayer avec ?id=
    let productId = url.searchParams.get("id");
    if (productId) return parseInt(productId);
    
    // 2️⃣ Essayer avec ?slug=
    const slug = url.searchParams.get("slug");
    if (slug) {
        productId = await getProductIdFromSlug(slug);
        return productId;
    }
    
    // 3️⃣ Fallback sur l'ancienne méthode (pathname)
    const parts = url.pathname.split("/");
    const lastPart = parts[parts.length - 1];
    
    // Si le dernier segment est un nombre, c'est probablement un ID
    if (!isNaN(parseInt(lastPart))) {
        return parseInt(lastPart);
    }
    
    console.log("[extractProductIdFromUrl] ❌ Aucun ID trouvé dans:", href);
    return null;
}


// -----------------------------
// Fonction pour afficher les vues récentes dans un container donné
// -----------------------------

async function renderRecentViewsOnContainer(items, container) {
    if (!container) {
        console.warn("[renderRecentViewsOnContainer] ❌ Container null");
        return;
    }
    
    if (container.dataset.rendered === "true") {
        console.log("[renderRecentViewsOnContainer] déjà rendu, skip");
        return;
    }
    container.dataset.rendered = "true";

    console.log("[renderRecentViewsOnContainer] Items reçus :", items);
    
    if (typeof window.jQuery !== "undefined" && $.fn.slick && $(container).hasClass("slick-initialized")) {
        $(container).slick("unslick");
    }

    // ✅ Vider le conteneur correctement
    container.innerHTML = "";

    if (!items || items.length === 0) {
        container.innerHTML = '<div class="text-center py-4">Aucun produit récent</div>';
        return;
    }

    // ✅ Créer les slides un par un
    items.forEach(item => {
        const product = item.product;
        if (!product) return;

        const mainImage = product.images?.find(img => img.is_main) || product.images?.[0];
        const imageUrl = mainImage ? mainImage.image_url.replace(/\\/g, "/") : "placeholder.jpg";
        const priceObj = product.prices?.[0];
        const price = priceObj ? priceObj.price : 0;
        const categoryName = product.category?.name || "";
        const catSlug = product.category?.slug || "";
        const productSlug = product.slug || "";

        // ✅ Utilisation du helper pour le prix
        const priceHtml = formatProductPrice(price, product.promo);

        // ✅ Créer le slide avec createElement
        const slide = document.createElement("div");
        slide.className = "js-slide";  // Seulement js-slide, pas products-group

        slide.innerHTML = `
            <div class="product-item">
                <div class="product-item__outer h-100 w-100">
                    <div class="product-item__inner px-wd-4 p-2 p-md-3">
                        <div class="product-item__body pb-xl-2">
                            <div class="mb-2">
                                <a href="/category-slug?slug=${catSlug}" class="font-size-12 text-gray-5">${categoryName}</a>
                            </div>
                            <h5 class="mb-1 product-item__title">
                                <a href="/single-product?slug=${productSlug}" class="text-blue font-weight-bold">${product.name}</a>
                            </h5>
                            <div class="mb-2 product-images-wrapper">
                                <a href="/single-product?slug=${productSlug}" class="d-block text-center">
                                    <img class="img-fluid img-212X305 main-img" src="${API}/${imageUrl}" alt="${product.name}" loading="lazy" decoding="async">
                                </a>
                            </div>
                            <div class="banner-overlay"></div>
                            <div class="flex-center-between mb-1">
                                <div class="prodcut-price">
                                    ${priceHtml}
                                </div>
                                <div class="d-none d-xl-block prodcut-add-cart">
                                    <a href="/single-product?slug=${productSlug}" class="btn-add-cart btn-primary transition-3d-hover">
                                        <i class="ec ec-add-to-cart"></i>
                                    </a>
                                </div>
                            </div>
                            <div class="product-item__footer">
                                <div class="border-top pt-2 flex-center-between flex-wrap">
                                    <a href="javascript:void(0)" 
                                       class="text-gray-6 font-size-13 wishlist-btn" 
                                       data-id="${product.id}">
                                        <i class="ec ec-favorites mr-1 font-size-15"></i> Wishlist
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.appendChild(slide);
    });

    initRecentSlick(container);
}

// Initialisation Slick ultra-simple

function initRecentSlick(container) {
    if (typeof window.jQuery === "undefined" || !$.fn.slick) return;

    const $container = $(container);
    const slideCount = container.querySelectorAll(":scope > .js-slide").length;
    if (!slideCount) return;

    const slidesAt = count => Math.min(count, slideCount);
    $container.slick({
        slidesToShow: slidesAt(4),
        slidesToScroll: 1,
        dots: slideCount > 4,
        arrows: slideCount > 4,
        infinite: slideCount > 4,
        responsive: [
            { breakpoint: 1200, settings: { slidesToShow: slidesAt(3), dots: slideCount > 3, arrows: slideCount > 3 } },
            { breakpoint: 768, settings: { slidesToShow: slidesAt(2), dots: slideCount > 2, arrows: slideCount > 2 } },
            { breakpoint: 480, settings: { slidesToShow: 1, dots: slideCount > 1, arrows: slideCount > 1 } }
        ]
    });
}

// -----------------------------
// Initialisation des vues récentes
// -----------------------------
async function initRecentViews() {
    console.log("🔄 Initialisation des vues récentes...");
    
    // 1️⃣ Ajouter la vue si on est sur une page produit
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');
    const id = urlParams.get('id');
    
    if (slug) {
        // Cas friendly URL
        console.log("🔍 Page produit détectée avec slug:", slug);
        const productId = await getProductIdFromSlug(slug);
        if (productId) {
            await addRecentView(productId);
            console.log("✅ Vue récente ajoutée pour slug:", slug);
        }
    } else if (id) {
        // Ancien cas (pour compatibilité)
        console.log("🔍 Page produit détectée avec id:", id);
        await addRecentView(id);
    }

    // 2️⃣ Intercepter les clics sur les liens produits
    document.addEventListener("click", async (e) => {
        const link = e.target.closest('a[href^="/single-product"]');
        if (!link) return;

        e.preventDefault();
        console.log("🔗 Clic sur lien produit:", link.href);
        
        const productId = await extractProductIdFromUrl(link.href);
        if (productId) {
            await addRecentView(productId);
            console.log("✅ Vue ajoutée via clic pour ID:", productId);
        }

        window.location.href = link.href;
    });

    // 3️⃣ Observer le DOM pour détecter tous les conteneurs .recent-products
    const observer = new MutationObserver(async () => {
        const containers = document.querySelectorAll(".recent-products");
        if (!containers.length) return;

        console.log("🔍 Conteneurs .recent-products trouvés:", containers.length);
        observer.disconnect();
        
        const products = await fetchRecentViews();
        if (!products.length) {
            console.log("ℹ️ Aucun produit récent à afficher");
            return;
        }

        containers.forEach(container => {
            renderRecentViewsOnContainer(products, container);
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // 4️⃣ Si conteneurs déjà présents au moment du chargement
    const existing = document.querySelectorAll(".recent-products");
    if (existing.length) {
        console.log("🔍 Conteneurs .recent-products déjà présents:", existing.length);
        const products = await fetchRecentViews();
        if (products.length) {
            existing.forEach(container => {
                renderRecentViewsOnContainer(products, container);
            });
        }
    }
}

// -----------------------------
// Lancer l'initialisation au chargement du DOM
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 DOM chargé, lancement initRecentViews()");
    initRecentViews();
});

// -----------------------------
// Exposer les fonctions utiles globalement (optionnel)
// -----------------------------
window.RecentViews = {
    add: addRecentView,
    fetch: fetchRecentViews,
    refresh: async () => {
        const containers = document.querySelectorAll(".recent-products");
        if (containers.length) {
            const products = await fetchRecentViews();
            containers.forEach(container => {
                container.dataset.rendered = "false";
                renderRecentViewsOnContainer(products, container);
            });
        }
    }
};
