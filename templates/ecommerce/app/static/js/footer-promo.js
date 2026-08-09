// ⭐ DÉFINIR LA FONCTION D'ABORD ⭐
function initFooter() {
    console.log("🚀 Initialisation du footer...");
    
    let promoMap = {};

    function shuffleAndLimit(array) {
        return array.sort(() => Math.random() - 0.5).slice(0, 3);
    }

    function buildProductItem(p, isOnSale = false, isTopRated = false) {
        const mainImage = p.images?.find(img => img.is_main)?.image_url.replace(/\\/g, "/") || "placeholder.jpg";
        const oldPrice = p.prices?.[0]?.price || 0;

        // ✅ GESTION DU PRIX
        let priceHTML = '';

        // CAS 1 : Prix sur demande (0 ou négatif)
        if (oldPrice <= 0) {
            priceHTML = `<span class="text-muted font-size-18"><i class="fab fa-whatsapp mr-2 font-size-18"></i>Prix sur demande</span>`;
        }
        // CAS 2 : Produit avec promo
        else if (promoMap[p.id]) {
            const discount = promoMap[p.id];
            const finalPrice = Math.round(oldPrice * (1 - discount / 100));
            priceHTML = `
                <div class="text-gray-100" style=" -webkit-text-fill-color: initial !important;">
                    <del class="font-size-11 text-gray-9 d-block">${oldPrice} XOF</del>
                    <ins class="font-size-15 text-red text-decoration-none d-block font-weight-bold">${finalPrice} XOF</ins>
                </div>
            `;
        }
        // CAS 3 : Prix normal
        else {
            priceHTML = `<span class="js-price" data-fcfa="${oldPrice}">${oldPrice} XOF</span>`;
        }

        // Construction des étoiles pour top-rated
        let ratingHTML = '';
        if (isTopRated) {
            const rating = p.rating || 0;
            const fullStars = Math.floor(rating);
            const hasHalfStar = rating % 1 >= 0.5;
            const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

            ratingHTML = `
                <div class="rating-stars mb-2">
                    ${'<i class="fas fa-star text-warning"></i>'.repeat(fullStars)}
                    ${hasHalfStar ? '<i class="fas fa-star-half-alt text-warning"></i>' : ''}
                    ${'<i class="far fa-star text-muted"></i>'.repeat(emptyStars)}
                    <span class="ml-1 small text-gray-60">(${rating.toFixed(1)})</span>
                </div>
            `;
        }

        return `
            <li class="product-item product-item__list row no-gutters mb-6 remove-divider">
                <div class="col-auto">
                    <a href="/single-product?id=${p.id}" class="d-block width-75 text-center">
                        <img class="img-fluid" src="${API}/${mainImage}" alt="${p.name}" loading="lazy" decoding="async">
                    </a>
                </div>
                <div class="col pl-4 d-flex flex-column">
                    <h5 class="product-item__title mb-0">
                        <a href="/single-product?id=${p.id}" class="text-blue font-weight-bold">${p.name}</a>
                    </h5>
                    ${ratingHTML}
                    <div class="prodcut-price mt-auto font-size-15">
                        ${priceHTML}
                    </div>
                </div>
            </li>
        `;
    }

    async function loadActivePromos() {
        try {
            const res = await fetch(`${API}/marketing/promo/active`);
            const promos = await res.json();
            promoMap = {};
            promos.forEach(p => {
                if (p.product) {
                    promoMap[p.product.id] = p.promo.discount_percent || 0;
                }
            });
            console.log("✅ Promos chargées:", promoMap);
            return promoMap;
        } catch (err) {
            console.error("Erreur promos:", err);
            return {};
        }
    }

    async function loadColumn(route, containerSelector) {
        try {
            const res = await fetch(`${API}/products/${route}`);
            const products = await res.json();
            const ul = document.querySelector(containerSelector);
            if (!ul) return;

            ul.innerHTML = "";
            const isOnSale = route === "on-sale";
            const isTopRated = route === "top-rated";
            
            shuffleAndLimit(products).forEach(p => {
                ul.insertAdjacentHTML("beforeend", buildProductItem(p, isOnSale, isTopRated));
            });
        } catch (err) {
            console.error(err);
        }
    }

    async function loadAllColumns() {
        await loadActivePromos();
        await Promise.all([
            loadColumn("featured", "#featured-column"),
            loadColumn("on-sale", "#onsale-column"),
            loadColumn("top-rated", "#toprated-column")
        ]);
        console.log("✅ Toutes les colonnes chargées");
    }

    // ⭐ INITIALISATION DE LA NEWSLETTER ⭐
    const form = document.querySelector(".js-validate.js-form-message");
    
    if (form) {
        console.log("✅ Formulaire newsletter trouvé, initialisation...");
        
        const oldMessage = form.parentNode.querySelector('.newsletter-message');
        if (oldMessage) oldMessage.remove();
        
        const messageBox = document.createElement("div");
        messageBox.className = 'newsletter-message mt-3';
        form.parentNode.appendChild(messageBox);

        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        
        newForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const newEmailInput = document.getElementById("subscribeSrEmail");
            const email = newEmailInput.value.trim();
            const messageBox = document.querySelector('.newsletter-message');
            
            if (!email) {
                messageBox.innerHTML = `<div class="alert alert-danger">Veuillez entrer un email valide.</div>`;
                return;
            }

            try {
                const res = await fetch(`${API}/subscribe/newsletter`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email })
                });
                
                const data = await res.json();

                if (res.ok) {
                    messageBox.innerHTML = `
                        <div class="alert alert-success">
                            ✅ ${data.message}<br>
                            🎁 Code bonus : <strong>${data.bonus_code}</strong><br>
                            Montant : ${data.bonus_amount}
                        </div>
                    `;
                    newForm.reset();
                } else {
                    messageBox.innerHTML = `<div class="alert alert-danger">${data.detail}</div>`;
                }
            } catch (error) {
                messageBox.innerHTML = `<div class="alert alert-danger">Erreur serveur. Veuillez réessayer.</div>`;
                console.error(error);
            }
        });
    } else {
        console.log("❌ Formulaire newsletter non trouvé");
    }

    // LANCER LE CHARGEMENT
    loadAllColumns();
}

// ⭐ LANCER L'INITIALISATION ⭐
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFooter);
} else {
    initFooter();
}
