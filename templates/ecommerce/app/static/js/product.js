
// ===============================================
// VARIABLES GLOBALES - MODIFIÉ
// ===============================================

const urlParams = new URLSearchParams(window.location.search);
// NE PAS initialiser productId avec ProductUtils.getCurrentProductId() ici
// car on veut d'abord vérifier l'URL
const urlId = urlParams.get('id');
const productSlug = urlParams.get('slug');

let productId = null;  // ← Sera initialisé plus tard
let selectedColorId = null;
let productData = null;




// ===============================================
// CHARGER LA PROMO D'UN PRODUIT
// ===============================================

async function loadProductPromo(productSlug) {
    try {
        console.log(`🔍 Vérification promo pour le slug: ${productSlug}`);
        
        const response = await fetch(`${API}/marketing/promo/active/slug/${productSlug}`);
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("📦 Données promo brutes:", data);
        
        // ✅ RENOMMÉ pour éviter conflit avec la variable globale productId
        const promoProductId = data.product_id;  // ← Disponible même sans promo
        
        if (data.has_promo) {
            // ✅ Cas avec promo
            const promoInfo = {
                hasPromo: true,
                id: data.promo.id,
                tag: data.promo.tag,
                discountPercent: data.promo.discount_percent,
                promoPrice: data.promo.discounted_price,
                originalPrice: data.product.prices[0]?.price || 0,
                startDate: data.promo.start_date,
                endDate: data.promo.end_date,
                storageKey: `promo_price_${promoProductId}`,
                productId: promoProductId,
                slug: data.product.slug
            };
            
            // ✅ Sauvegarder dans localStorage avec le bon ID
            localStorage.setItem(promoInfo.storageKey, promoInfo.promoPrice);
            localStorage.setItem(`promo_percent_${promoProductId}`, promoInfo.discountPercent);
            
            console.log("🎁 Promo trouvée:", promoInfo);
            return promoInfo;
            
        } else {
            // ✅ Cas sans promo
            console.log("ℹ️ Aucune promo active pour ce produit");
            
            // ✅ Nettoyer localStorage avec le bon ID
            localStorage.removeItem(`promo_price_${promoProductId}`);
            localStorage.removeItem(`promo_percent_${promoProductId}`);
            
            return {
                hasPromo: false,
                productId: promoProductId,
                slug: productSlug
            };
        }
        
    } catch (error) {
        console.error(`❌ Erreur chargement promo pour ${productSlug}:`, error);
        
        return {
            hasPromo: false,
            error: true,
            message: error.message,
            slug: productSlug
        };
    }
}

// ===============================================
// CHARGEMENT DU PRODUIT (AVEC GESTION LOCALSTORAGE)
// ===============================================


async function loadProduct() {
    try {
        

        // 1️⃣ Récupérer l'identifiant (priorité à l'URL)
        const urlParams = new URLSearchParams(window.location.search);
        const urlId = urlParams.get('id');
        const urlSlug = urlParams.get('slug');
        
        let productIdentifier = urlSlug || urlId;
        
        if (!productIdentifier) {
            // Fallback sur le localStorage
            const storedId = ProductUtils.getCurrentProductId();
            if (storedId) {
                productIdentifier = storedId;
                console.log(`📦 Utilisation ID depuis localStorage: #${productIdentifier}`);
            } else {
                throw new Error("Aucun identifiant produit trouvé");
            }
        }
        
        console.log(`🔍 Chargement produit avec identifiant: ${productIdentifier}`);
        
        // 2️⃣ Construire l'URL API (slug ou ID)
        const isSlug = typeof productIdentifier === 'string' && productIdentifier.includes('-');
        const apiUrl = isSlug 
            ? `${API}/products/slug/${productIdentifier}`
            : `${API}/products/${productIdentifier}`;
        
        // 3️⃣ Charger le produit
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`Erreur HTTP: ${res.status}`);
        productData = await res.json();
        
        // 4️⃣ ✅ METTRE À JOUR LE LOCALSTORAGE AVEC LE NOUVEL ID
        const newProductId = productData.id;
        const newProductSlug = productData.slug;
        
        // Nettoyer l'ancien produit si différent
        const oldId = localStorage.getItem('current_product_id');
        if (oldId && oldId != newProductId) {
            localStorage.removeItem(`promo_price_${oldId}`);
            localStorage.removeItem(`promo_percent_${oldId}`);
            console.log(`🧹 Ancien produit #${oldId} nettoyé`);
        }
        
        // Enregistrer le nouveau produit
        ProductUtils.updateCurrentProduct(newProductId, newProductSlug);
        localStorage.setItem('current_product_slug', newProductSlug);
        console.log(`✅ Nouveau produit enregistré: #${newProductId} - ${newProductSlug}`);
        
        // Mettre à jour la variable globale productId
        productId = newProductId;
        
        // 5️⃣ Charger la promo (avec le slug)
        const promoInfo = await loadProductPromo(newProductSlug);
        productData.promoInfo = promoInfo;
        
        // 6️⃣ Afficher les informations produit
        // Nom
        const nameEl = document.getElementById("productName");
        if (nameEl) nameEl.textContent = productData.name;
        
        // Stock
        const stockEl = document.getElementById("productStock");
        if (stockEl && productData.inventory) {
            stockEl.textContent = productData.inventory.quantity + " in stock";
        }
        
        // Rating (étoiles)
        const ratingEl = document.getElementById("productRating");
        if (ratingEl) {
            ratingEl.innerHTML = "";
            const maxStars = 5;
            for (let i = 1; i <= maxStars; i++) {
                if (i <= productData.rating) {
                    ratingEl.innerHTML += `<small class="fas fa-star"></small>`;
                } else {
                    ratingEl.innerHTML += `<small class="far fa-star text-muted"></small>`;
                }
            }
        }
        
        // Nombre d'avis
        const reviewsEl = document.getElementById("productReviews");
        if (reviewsEl) reviewsEl.textContent = `(${productData.reviews?.length || 0} avis clients)`;
        
        // ✅ PRIX AVEC OU SANS PROMO
        const priceEl = document.getElementById("productPrice");
        if (priceEl && productData.prices.length > 0) {
            const originalPrice = productData.prices[0].price;
        
        
            
            if (promoInfo?.hasPromo) {
                // Affichage avec promo
                priceEl.innerHTML = `
                    <div class="price-container d-flex align-items-center">
                        <del class="font-size-18 text-gray-2 mr-2">
                            <span class="js-price" data-fcfa="${originalPrice}">${originalPrice.toLocaleString()} XOF</span>
                        </del>
                        <ins class="font-size-30 text-red text-decoration-none font-weight-bold mr-2">
                            <span class="js-price" data-fcfa="${promoInfo.promoPrice}">${promoInfo.promoPrice.toLocaleString()} XOF</span>
                        </ins>
                        <span class="badge badge-danger py-2 px-3">-${promoInfo.discountPercent}%</span>
                    </div>
                `;
            } else {
                // Affichage normal
                priceEl.innerHTML = `
                    <ins class="font-size-30 text-gray-90 text-decoration-none font-weight-bold">
                        <span class="js-price" data-fcfa="${originalPrice}">${originalPrice.toLocaleString()} XOF</span>
                    </ins>
                `;
            }
        }
        
         // ✅ AJOUTER L'ID AU BOUTON WISHLIST (ici, après avoir défini productId)
        const wishlistBtn = document.querySelector('.wishlist-btn');
        if (wishlistBtn) {
            wishlistBtn.dataset.productId = productId;
            console.log(`❤️ Bouton wishlist initialisé avec l'ID: ${productId}`);
        } else {
            console.warn("⚠️ Bouton wishlist non trouvé dans le DOM");
        }

        // 7️⃣ Images - Trier : mettre l'image principale en premier
        const sortedImages = productData.images?.sort((a, b) => b.is_main - a.is_main) || [];
        const galleryImages = sortedImages.length
            ? sortedImages
            : [{ image_url: "uploads/products/demo-placeholders/demo-accessory.webp", is_main: true }];
        const sliderNav = document.getElementById("sliderSyncingNav");
        const sliderThumb = document.getElementById("sliderSyncingThumb");

        // Les sliders peuvent avoir été initialisés vides au chargement de la page.
        // Il faut les démonter avant d'injecter les images pour préserver le DOM Slick.
        [sliderNav, sliderThumb].forEach(slider => {
            if (slider && typeof window.jQuery !== "undefined" && $.fn.slick && $(slider).hasClass("slick-initialized")) {
                $(slider).slick("unslick");
            }
        });

        // Slider principal
        if (sliderNav) {
            sliderNav.innerHTML = "";
            galleryImages.forEach((img, index) => {
                sliderNav.innerHTML += `
                    <div class="js-slide">
                        <img class="img-fluid" src="${API}/${img.image_url}" alt="${productData.name}" loading="${index === 0 ? 'eager' : 'lazy'}" decoding="async">
                    </div>
                `;
            });
        }
        
        // Slider thumbnails
        if (sliderThumb) {
            sliderThumb.innerHTML = "";
            galleryImages.forEach(img => {
                sliderThumb.innerHTML += `
                    <div class="js-slide" style="cursor: pointer;">
                        <img class="img-fluid thumbnail-img" src="${API}/${img.image_url}" alt="${productData.name}" loading="lazy" decoding="async">
                    </div>
                `;
            });
        }

        initProductGallerySliders(sliderNav, sliderThumb, galleryImages.length);
        
        console.log(`✅ Produit #${newProductId} chargé avec succès`);

        
        
        // ✅ Déclencher un événement personnalisé
        document.dispatchEvent(new CustomEvent('productLoaded', { 
            detail: { productId: newProductId, productData: productData }
        }));

        // ✅ AJOUTER CETTE LIGNE À LA FIN (avant return)
        const price = productData.prices?.[0]?.price || 0;
        const soldOut = window.ProductAvailability?.isSoldOut(productData)
            ?? (Number(productData.inventory?.quantity) === 0);
        updateActionButton(price, soldOut);
        
        
        return productData;


        
    } catch (error) {
        console.error("❌ Erreur chargement produit:", error);
        // Afficher un message d'erreur à l'utilisateur
        const container = document.querySelector(".product-details");
        if (container) {
            container.innerHTML = `<div class="alert alert-danger">Erreur de chargement du produit: ${error.message}</div>`;
        }
    }
}

function initProductGallerySliders(sliderNav, sliderThumb, imageCount) {
    if (!sliderNav || !sliderThumb || !imageCount || typeof window.jQuery === "undefined" || !$.fn.slick) return;

    const thumbCount = Math.min(5, imageCount);

    $(sliderNav).slick({
        slidesToShow: 1,
        slidesToScroll: 1,
        arrows: imageCount > 1,
        dots: false,
        fade: imageCount > 1,
        infinite: imageCount > 1,
        adaptiveHeight: false,
        asNavFor: "#sliderSyncingThumb"
    });

    $(sliderThumb).slick({
        slidesToShow: thumbCount,
        slidesToScroll: 1,
        arrows: imageCount > thumbCount,
        dots: false,
        infinite: imageCount > thumbCount,
        focusOnSelect: true,
        asNavFor: "#sliderSyncingNav",
        responsive: [
            { breakpoint: 768, settings: { slidesToShow: Math.min(4, imageCount) } },
            { breakpoint: 480, settings: { slidesToShow: Math.min(3, imageCount) } }
        ]
    });
}

// ===============================================
// GESTION DYNAMIQUE DU BOUTON (PANIER vs WHATSAPP)
// ===============================================

function updateActionButton(price, soldOut = false) {
    const actionBtn = document.getElementById("addToCartBtn");
    const quantitySection = document.querySelector(".d-md-flex.align-items-end.mb-3");
    const quantityControl = quantitySection?.querySelector(".max-width-150");
    const colorSection = document.getElementById("colorOptions")?.closest('.border-bottom');
    const variantSection = document.getElementById("variants-section");
    const priceElement = document.getElementById("productPrice");
    const oldPriceElement = document.getElementById("productOldPrice");
    const stockElement = document.getElementById("productStock");
    const productContainer = document.getElementById("single-product-container");
    const hasVariants = Array.isArray(productVariants) && productVariants.length > 0;
    
    if (!actionBtn || !productContainer) return;
    
    // 🔍 DEBUG
    console.log("💰 updateActionButton - prix reçu:", price, "type:", typeof price);
    console.log("🔍 Condition price > 0:", price > 0);
    
    // ✅ CORRECTION : S'assurer que price est un nombre
    const numericPrice = Number(price) || 0;
    const hasPrice = numericPrice > 0;
    
    console.log("📊 hasPrice:", hasPrice);
    
    window.ProductAvailability?.setSingleProductState(soldOut);
    if (soldOut && stockElement) {
        stockElement.textContent = "Vendu";
        stockElement.className = "text-danger font-weight-bold";
    }

    if (hasPrice && !soldOut) {
        console.log("✅ Mode NORMAL - prix:", numericPrice);
        actionBtn.innerHTML = `
            <i class="ec ec-add-to-cart mr-2 font-size-20"></i> 
            Ajouter au panier
        `;
        actionBtn.classList.remove('btn-whatsapp');
        actionBtn.classList.add('btn-primary-dark', 'btn-prestige-3d');
        actionBtn.onclick = addToCartHandler;
        
        productContainer.classList.remove('whatsapp-mode');
        if (priceElement) priceElement.style.display = '';
        if (oldPriceElement) oldPriceElement.style.display = '';
        if (quantitySection) quantitySection.style.display = 'flex';
        if (quantityControl) quantityControl.style.display = '';
        if (colorSection) colorSection.style.display = 'block';
        if (variantSection) variantSection.style.display = hasVariants ? 'block' : 'none';
        
    } else {
        console.log("📱 Mode WHATSAPP - prix:", numericPrice);
        actionBtn.innerHTML = `
            <i class="fab fa-whatsapp mr-2 font-size-20"></i>
            Passer la commande
        `;
        actionBtn.classList.remove('btn-primary-dark', 'btn-prestige-3d');
        actionBtn.classList.add('btn-whatsapp');
        actionBtn.onclick = buyNowWhatsAppHandler;
        
        productContainer.classList.add('whatsapp-mode');
        if (priceElement) priceElement.style.display = 'none';
        if (oldPriceElement) oldPriceElement.style.display = 'none';
        if (quantitySection) quantitySection.style.display = 'flex';
        if (quantityControl) quantityControl.style.display = soldOut ? 'none' : '';
        if (colorSection) colorSection.style.display = 'none';
        if (variantSection) variantSection.style.display = hasVariants ? 'block' : 'none';
    }
}

// Handler pour le mode normal (panier) - c'est ton code existant
async function addToCartHandler(e) {
    // On réutilise exactement le code de ton addToCartBtn existant
    // Mais on doit éviter la double déclaration d'événements
    
    e.preventDefault();
    
    const quantity = parseInt(document.getElementById("quantityInput").value);
    const hasVariants = productVariants && productVariants.length > 0;
    
    if (hasVariants) {
        if (!selectedVariant) {
            alert("Veuillez sélectionner une configuration");
            return;
        }
        if (selectedVariant.stock <= 0) {
            alert("Cette configuration n'est pas disponible");
            return;
        }
        if (quantity > selectedVariant.stock) {
            alert("Quantité supérieure au stock disponible");
            return;
        }
        
        const payload = {
            variant_id: selectedVariant.id,
            quantity: quantity,
            color_id: selectedColorId ? parseInt(selectedColorId) : null
        };
        
        try {
            const res = await fetch(`${API}/cart/add`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                credentials: "include",
            });
            
            if (res.ok) {
                if (typeof window.refreshCartBadge === "function") {
                    await window.refreshCartBadge();
                }
                alert("Produit ajouté au panier !");
            } else {
                const error = await res.json();
                alert("Erreur: " + (error.detail || "Erreur inconnue"));
            }
        } catch (err) {
            console.error("Erreur ajout panier:", err);
            alert("Erreur réseau");
        }
        
    } else {
        if (!productData || !productData.inventory) {
            alert("Produit non disponible.");
            return;
        }
        if (!selectedColorId) {
            alert("Veuillez sélectionner une couleur !");
            return;
        }
        if (quantity > productData.inventory.quantity) {
            alert("Quantité supérieure au stock disponible !");
            return;
        }

        const payload = {
            product_id: parseInt(productId),
            quantity: quantity,
            color_id: parseInt(selectedColorId)
        };

        if (productData.promoInfo && productData.promoInfo.hasPromo) {
            payload.promo_price = productData.promoInfo.promoPrice;
        }

        try {
            const res = await fetch(`${API}/cart/add`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                credentials: "include",
            });

            if (res.ok) {
                if (typeof window.refreshCartBadge === "function") {
                    await window.refreshCartBadge();
                }
                alert("Produit ajouté au panier !");
            } else {
                const error = await res.json();
                alert("Erreur: " + (error.detail || "Erreur inconnue"));
            }
        } catch (err) {
            console.error("Erreur ajout panier:", err);
            alert("Erreur réseau");
        }
    }
}

// Handler pour le mode WhatsApp
async function buyNowWhatsAppHandler(e) {
    e.preventDefault();
    
    const productId = productData?.id;
    if (!productId) {
        alert("Erreur: produit non identifié");
        return;
    }
    
    const popup = window.open("", "_blank");

    try {
        // Feedback utilisateur
        const btn = e.currentTarget;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Préparation...';
        btn.disabled = true;
        
        // Appeler la nouvelle route
        const res = await fetch(`${API}/cart/${productId}/whatsapp`, { credentials: "include" });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.detail || "Erreur de génération du message");
        }
        
        const data = await res.json();
        
        // Ouvrir WhatsApp
        if (popup) popup.location.replace(data.whatsapp_url);
        else window.location.href = data.whatsapp_url;
        
        // Restaurer le bouton
        btn.innerHTML = originalText;
        btn.disabled = false;
        
    } catch (error) {
        popup?.close();
        console.error("❌ Erreur WhatsApp:", error);
        alert("Impossible d'ouvrir WhatsApp: " + error.message);
        
        // Restaurer le bouton
        const btn = e.currentTarget;
        btn.innerHTML = '<i class="fab fa-whatsapp mr-2"></i> Passer la commande';
        btn.disabled = false;
    }
}

// -----------------------------------------------
// BTN Wishlist
// -----------------------------------------------

// ===============================================
// GESTION DES FAVORIS SUR PAGE PRODUIT
// ===============================================

function initWishlistButton() {
    const wishlistBtn = document.querySelector('.wishlist-btn');
    
    if (!wishlistBtn) return;
    
    // Récupérer l'ID du produit via ProductUtils
    const productId = ProductUtils.getCurrentProductId();
    
    if (!productId) {
        console.error("❌ Impossible de récupérer l'ID du produit pour la wishlist");
        return;
    }
    
    // Ajouter l'ID au bouton
    wishlistBtn.dataset.id = productId;
    
    // Vérifier si le produit est déjà en favoris
    checkIfInWishlist(productId, wishlistBtn);
    
    // Ajouter l'événement de clic
    wishlistBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const productId = wishlistBtn.dataset.id;
        
        if (!productId) {
            alert("Erreur: ID produit non trouvé");
            return;
        }
        
        try {
            const token = localStorage.getItem('access_token');
            
            if (!token) {
                // Rediriger vers la page de connexion
                window.location.href = '/wishlist';
                return;
            }
            
            const res = await fetch(`${API}/favorites/add/${productId}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                credentials: "include"
            });
            
            if (res.ok) {
                const data = await res.json();
                if (typeof window.refreshWishlistBadge === "function") {
                    await window.refreshWishlistBadge();
                }
                alert("✅ Produit ajouté aux favoris");
                updateWishlistButtonState(wishlistBtn, true);
            } else if (res.status === 409) {
                alert("ℹ️ Produit déjà dans vos favoris");
            } else {
                throw new Error("Erreur lors de l'ajout");
            }
            
        } catch (err) {
            console.error("❌ Erreur wishlist:", err);
            alert("Erreur lors de l'ajout aux favoris");
        }
    });
}

// Vérifier si le produit est déjà en favoris
async function checkIfInWishlist(productId, btn) {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        
        const res = await fetch(`${API}/favorites/`, {
            headers: { "Authorization": `Bearer ${token}` },
            credentials: "include"
        });
        
        if (res.ok) {
            const favorites = await res.json();
            const isInWishlist = favorites.some(fav => fav.product.id === productId);
            
            if (isInWishlist) {
                updateWishlistButtonState(btn, true);
            }
        }
    } catch (err) {
        console.error("❌ Erreur vérification favoris:", err);
    }
}

// Mettre à jour l'apparence du bouton
function updateWishlistButtonState(btn, isInWishlist) {
    if (isInWishlist) {
        btn.classList.add('active');
        btn.innerHTML = '<i class="ec ec-favorites mr-1 font-size-15" style="color: #e74a3b;"></i> Dans favoris';
    } else {
        btn.classList.remove('active');
        btn.innerHTML = '<i class="ec ec-favorites mr-1 font-size-15"></i> Ajouter aux favoris';
    }
}


// ===============================================
// COULEURS (inchangé)
// ===============================================
async function loadColors() {
    try {
        const res = await fetch(`${API}/filter/products/${productId}/colors`);
        const colors = await res.json();

        const select = document.getElementById("colorOptions");
        if (!select) return;

        select.innerHTML = "";

        colors.forEach(c => {
            const option = document.createElement("option");
            option.value = c.id;
            option.textContent = c.color;
            select.appendChild(option);
        });

        if (colors.length > 0) {
            select.value = colors[0].id;
            selectedColorId = colors[0].id;
            
            // ✅ Initialisation sécurisée
            if ($(select).hasClass("selectpicker")) {
                setTimeout(() => {
                    try {
                        $(select).selectpicker('refresh');
                        $(select).selectpicker('val', select.value);
                    } catch (err) {
                        console.warn("bootstrap-select non disponible");
                    }
                }, 200);
            }
        }

        select.addEventListener("change", () => {
            selectedColorId = select.value;
        });
        
    } catch (error) {
        console.error("Erreur couleurs:", error);
    }
}
// ===============================================
// GESTION QUANTITÉ (inchangé)
// ===============================================
// ✅ Mettre à jour les boutons + et - pour respecter le stock
document.getElementById("plusBtn").addEventListener("click", () => {
    const quantityInput = document.getElementById("quantityInput");
    let qty = parseInt(quantityInput.value);
    
    if (selectedVariant) {
        // Cas produit avec variante
        if (qty < selectedVariant.stock) {
            quantityInput.value = qty + 1;
        } else {
            alert(`Stock maximum: ${selectedVariant.stock}`);
        }
    } else {
        // Cas produit simple (comportement actuel)
        if (!productData || !productData.inventory) return;
        if (qty < productData.inventory.quantity) {
            quantityInput.value = qty + 1;
        } else {
            alert("Stock maximum atteint !");
        }
    }
});

document.getElementById("minusBtn").addEventListener("click", () => {
    const quantityInput = document.getElementById("quantityInput");
    let qty = parseInt(quantityInput.value);
    if (qty > 1) {
        quantityInput.value = qty - 1;
    }
});



// ---------------------------------------------------------------------------------
// Review
// --------------------------------------------------------------------------------

// Fonction utilitaire pour récupérer le token
// ✅ 1. Vérifier si l'utilisateur est connecté
function isAuthenticated() {
    return !!localStorage.getItem('access_token');
}

// ✅ 2. Récupérer les infos de l'utilisateur connecté
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// ✅ 3. Headers pour les requêtes JSON (GET /auth/me, etc.)
function getJsonHeaders() {
    const token = localStorage.getItem('access_token');
    const headers = {
        'Content-Type': 'application/json'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

// ✅ 4. Headers pour les requêtes FormData (POST review, login, etc.)
function getFormHeaders() {
    const token = localStorage.getItem('access_token');
    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    // ⚠️ Pas de Content-Type pour FormData
    return headers;
}

async function loadReviews() {
    try {
        const res = await fetch(`${API}/reviews/${productId}`);
        if (!res.ok) throw new Error('Erreur chargement avis');
        const reviews = await res.json();
        console.log("📊 Type de rating:", typeof reviews[0]?.rating);
        console.log("📊 Valeur de rating:", reviews[0]?.rating);

        const reviewsList = document.getElementById('reviews-list');
        const overallRatingDiv = document.getElementById('overall-rating');

        // Calcul note globale
        const avgRating = reviews.length > 0 
            ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) 
            : 0;

        // Affichage note globale
        overallRatingDiv.innerHTML = '';
        for(let i = 1; i <= 5; i++){
            const star = document.createElement('i');
            star.className = i <= avgRating ? 'fas fa-star text-warning' : 'far fa-star text-muted';
            overallRatingDiv.appendChild(star);
        }
        const spanCount = document.createElement('span');
        spanCount.className = 'ml-2';
        spanCount.textContent = `(${reviews.length} review${reviews.length > 1 ? 's' : ''})`;
        overallRatingDiv.appendChild(spanCount);

        // Injection reviews
        reviewsList.innerHTML = '';
        if (reviews.length === 0) {
            reviewsList.innerHTML = '<p class="text-muted">Aucun avis pour le moment.</p>';
        } else {
            reviews.forEach(review => {
                // ✅ Conversion en nombre
                const rating = Number(review.rating) || 0;
                
                // ✅ Debug
                console.log(`Review: commentaire="${review.comment.substring(0,20)}...", rating=${rating}`);
                
                // ✅ Génération des étoiles
                let starsHtml = '';
                for (let i = 1; i <= 5; i++) {
                    if (i <= rating) {
                        starsHtml += '<i class="fas fa-star"></i>';
                    } else {
                        starsHtml += '<i class="far fa-star text-muted"></i>';
                    }
                }
                
                const div = document.createElement('div');
                div.className = 'border-bottom border-color-1 pb-4 mb-4';
                div.innerHTML = `
                    <div class="text-warning font-size-16 mb-1">
                        ${starsHtml}
                    </div>
                    <p class="text-gray-90">${review.comment}</p>
                    <div class="mb-2">
                        <strong>${review.admin?.username || 'Anonyme'}</strong>
                        <span class="font-size-13 text-gray-23">- ${new Date(review.created_at).toLocaleDateString()}</span>
                    </div>
                `;
                reviewsList.appendChild(div);
            });
        }

        // Gestion du formulaire d'avis
        const reviewFormContainer = document.getElementById('review-form-container');
        
        if (isAuthenticated()) {
            reviewFormContainer.innerHTML = `
                <div class="mt-4">
                    <h5 class="mb-3">Écrire un avis</h5>
                    <form id="add-review-form">
                        <div class="form-group mb-3">
                            <label for="rating">Note</label>
                            <select class="form-control" id="rating" name="rating" required>
                                <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
                                <option value="4">⭐⭐⭐⭐ Très bien</option>
                                <option value="3">⭐⭐⭐ Bien</option>
                                <option value="2">⭐⭐ Moyen</option>
                                <option value="1">⭐ Mauvais</option>
                            </select>
                        </div>
                        <div class="form-group mb-3">
                            <label for="comment">Votre avis</label>
                            <textarea class="form-control" id="comment" name="comment" rows="4" required placeholder="Partagez votre expérience..."></textarea>
                        </div>
                        <button type="submit" class="nt-review-submit">
                            <i class="ec ec-check nt-review-submit__icon" aria-hidden="true"></i>
                            <span class="nt-review-submit__label">Publier mon avis</span>
                            <span class="nt-review-submit__spinner" aria-hidden="true"></span>
                        </button>
                    </form>
                </div>
            `;
            
            document.getElementById('add-review-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const comment = document.getElementById('comment').value;
                const rating = document.getElementById('rating').value;
                
                // ✅ Conversion string → nombre
                const ratingNumber = parseInt(rating, 10);
                
                console.log("📤 Envoi avis:", { 
                    comment, 
                    rating: ratingNumber,
                    type: typeof ratingNumber 
                });
                
                // Désactiver le bouton
                const submitBtn = e.target.querySelector('button[type="submit"]');
                submitBtn.disabled = true;
                submitBtn.classList.add('is-loading');
                submitBtn.setAttribute('aria-busy', 'true');
                submitBtn.querySelector('.nt-review-submit__label').textContent = 'Publication en cours…';
                
                try {
                    const token = localStorage.getItem('access_token');
                    
                    // ✅ URL avec rating en nombre
                    const url = new URL(`${API}/reviews/${productId}`);
                    url.searchParams.append('comment', comment);
                    url.searchParams.append('rating', ratingNumber); // Ici c'est un nombre
                    
                    const res = await fetch(`${API}/reviews/${productId}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            comment: comment,
                            rating: ratingNumber
                        })
                    });

                    
                    if (res.ok) {
                        submitBtn.classList.remove('is-loading');
                        submitBtn.classList.add('is-success');
                        submitBtn.removeAttribute('aria-busy');
                        submitBtn.querySelector('.nt-review-submit__label').textContent = 'Avis publié !';
                        await new Promise(resolve => setTimeout(resolve, 700));
                        await loadReviews();
                    } else {
                        const error = await res.json();
                        alert(`❌ Erreur: ${error.detail || 'Impossible de publier l\'avis'}`);
                    }
                } catch (error) {
                    console.error('Erreur:', error);
                    alert('❌ Erreur de connexion au serveur');
                } finally {
                    if (submitBtn.isConnected) {
                        submitBtn.disabled = false;
                        submitBtn.classList.remove('is-loading', 'is-success');
                        submitBtn.removeAttribute('aria-busy');
                        submitBtn.querySelector('.nt-review-submit__label').textContent = 'Publier mon avis';
                    }
                }
            });
            
        } else {
            reviewFormContainer.innerHTML = `
                <div class="alert alert-warning mt-4">
                    <i class="ec ec-info-circle mr-2"></i>
                    Veuillez 
                    <a href="/my-mobile-account" 
                       role="button" 
                       class="u-header-topbar__nav-link font-weight-bold"
                      >
                       <u>vous connecter</u>
                    </a> 
                    pour laisser un avis.
                </div>
            `;
        }
        
    } catch (error) {
        console.error('❌ Erreur chargement avis:', error);
        const reviewsList = document.getElementById('reviews-list');
        if (reviewsList) {
            reviewsList.innerHTML = '<div class="alert alert-danger">Erreur de chargement des avis</div>';
        }
    }
}

// ✅ Tu peux supprimer la fonction submitReview() car on n'en a plus besoin





// --------------------------------------------------------------------------------
// END Review
//---------------------------------------------------------------------------------

// ---------- Charger les accessoires pour la tab ----------
function loadAccessories() {
    if (!productId || !productData) {
        console.warn("⏳ Produit pas encore chargé, attente de l'événement...");
        return;
    }

    try {
        const categorySlug = productData.category?.slug;
        if (!categorySlug) throw new Error("Pas de catégorie trouvée");

        console.log(`🔍 Accessoires pour catégorie "${categorySlug}"`);

        fetch(`${API}/categories/accessories?parent_slug=${categorySlug}&limit=3`)
            .then(res => res.json())
            .then(accessories => {
                renderAccessories(accessories);
                renderProductDescription(productData);
                renderProductSpecifications(productData);
            })
            .catch(err => console.error("Erreur chargement accessoires", err));

    } catch (err) {
        console.error("Erreur chargement accessoires", err);
    }
}

// Écouter l'événement de chargement du produit
document.addEventListener('productLoaded', (event) => {
    console.log("🎯 Produit chargé, lancement des accessoires");
    productId = event.detail.productId;
    productData = event.detail.productData;
    loadAccessories();
});

// Tentative immédiate au cas où le produit serait déjà chargé
document.addEventListener("DOMContentLoaded", () => {
    if (productId && productData) {
        loadAccessories();
    }
});

// ------------------------------------------------------
// Render accessoires
// ------------------------------------------------------
function renderAccessories(products) {
    const ulContainer = document.querySelector(".products-group");
    const checkboxContainer = document.getElementById("accessory-checkboxes");
    const btnAddAll = document.getElementById("add-all-accessories");
    const totalEl = document.getElementById("accessories-total");

    if (!ulContainer || !checkboxContainer || !btnAddAll) return;

    ulContainer.innerHTML = "";
    checkboxContainer.innerHTML = "";

    if (!Array.isArray(products) || products.length === 0) {
        ulContainer.innerHTML = '<li class="col-12"><div class="nt-accessories-empty">Aucun accessoire complémentaire disponible pour ce produit.</div></li>';
        btnAddAll.disabled = true;
        updateAccessoriesTotal([]);
        return;
    }

    btnAddAll.disabled = false;

    products.forEach((p, idx) => {
        const price = p.prices?.[0]?.price || 0;
        const priceHtml = formatProductPrice(price, p.promo);
        const prodSlug = p.slug || "";
        const categoryName = p.category?.name || "Accessoire";
        const mainImage = (p.images?.find(image => image.is_main) || p.images?.[0])?.image_url?.replace(/\\/g, "/") || "uploads/products/demo-placeholders/demo-accessory.webp";

        // Produit dans <ul>
        const li = document.createElement("li");
        li.className = "col-12 col-sm-6 col-xl-4 product-item nt-accessory-item";
        li.innerHTML = `
            <div class="nt-accessory-card is-selected">
                <div class="nt-accessory-card__select">
                    <input class="accessory-checkbox" type="checkbox" id="accessory-${idx}" data-price="${price}" checked>
                    <label for="accessory-${idx}" aria-label="Sélectionner ${p.name}"><i class="fas fa-check" aria-hidden="true"></i></label>
                </div>
                <a href="/single-product?slug=${prodSlug}" class="nt-accessory-card__image">
                    <img src="${API}/${mainImage}" alt="${p.name}" loading="lazy">
                </a>
                <div class="nt-accessory-card__content">
                    <span class="nt-accessory-card__category">${categoryName}</span>
                    <h5><a href="/single-product?slug=${prodSlug}">${p.name}</a></h5>
                    <div class="nt-accessory-card__price">${priceHtml}</div>
                </div>
            </div>
        `;
        ulContainer.appendChild(li);

        const checkbox = li.querySelector(`#accessory-${idx}`);
        checkbox.addEventListener('change', function() {
            li.querySelector('.nt-accessory-card')?.classList.toggle('is-selected', checkbox.checked);
            updateAccessoriesTotal(products);
        });
    });

    // Gestion bouton Add all
    btnAddAll.onclick = () => {
        const checkedAccessories = products.filter((_, idx) =>
            document.getElementById(`accessory-${idx}`).checked
        );
        addAccessoriesToCart(checkedAccessories);
        updateAccessoriesTotal(products);
    };

    // Prix total initial
    updateTotalPrice(products);
}

async function addToCart(productId) {
    const payload = {
        product_id: parseInt(productId),
        quantity: 1,
        color_id: null // pas de couleur pour les accessoires
    };

    try {
        const res = await fetch(`${API}/cart/add`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            credentials: "include",

        });

        if (!res.ok) {
            console.warn(`Erreur ajout produit ${productId}`);
        } else if (typeof window.refreshCartBadge === "function") {
            await window.refreshCartBadge();
        }
    } catch (err) {
        console.error(`Erreur ajout produit ${productId}`, err);
    }
}

// ------------------------------------------------------
// Ajout au panier avec modal personnalisé
// ------------------------------------------------------
function addAccessoriesToCart(products) {
    const normalProducts = products.filter(p => (p.prices[0]?.price || 0) > 0);
    const priceOnDemandProducts = products.filter(p => (p.prices[0]?.price || 0) <= 0);
    
    // Ajouter les produits normaux immédiatement
    normalProducts.forEach(p => {
        addToCart(p.id);
    });
    
    // Si des produits sur demande sont sélectionnés
    if (priceOnDemandProducts.length > 0) {
        // Afficher le modal avec la liste des produits
        showPriceOnDemandModal(priceOnDemandProducts, normalProducts.length);
    } else {
        // Message normal
        alert(`✅ ${normalProducts.length} accessoire(s) ajouté(s) au panier !`);
    }
}

// Afficher le modal avec la liste des produits sur demande
function showPriceOnDemandModal(products, normalCount) {
    const modal = $('#priceOnDemandModal');
    const listContainer = document.getElementById('priceOnDemandList');
    
    // Générer la liste des produits
    listContainer.innerHTML = products.map(p => `
        <div class="list-group-item d-flex justify-content-between align-items-center">
            <div>
                <i class="fas fa-box mr-2" style="color: #25D366;"></i>
                <strong>${p.name}</strong>
            </div>
            <span class="badge badge-warning">Prix sur demande</span>
        </div>
    `).join('');
    
    // Stocker les produits à ajouter pour confirmation
    window.priceOnDemandToAdd = products;
    window.normalProductsCount = normalCount;
    
    // Afficher le modal
    modal.modal('show');
}

// Confirmation d'ajout des produits sur demande
document.getElementById('confirmAddPriceOnDemand').addEventListener('click', function() {
    const products = window.priceOnDemandToAdd || [];
    const normalCount = window.normalProductsCount || 0;
    
    // Ajouter les produits sur demande
    products.forEach(p => {
        addToCart(p.id);
    });
    
    // Fermer le modal
    $('#priceOnDemandModal').modal('hide');
    
    // Message final
    const totalCount = normalCount + products.length;
    if (normalCount > 0) {
        alert(`✅ ${totalCount} accessoire(s) ajouté(s) au panier !\n⚠️ Pensez à contacter le commercial pour les articles sur demande.`);
    } else {
        alert(`⚠️ Articles sur demande ajoutés.\n📞 Contactez notre commercial pour finaliser.`);
    }
    
    // Nettoyer
    window.priceOnDemandToAdd = null;
    window.normalProductsCount = 0;
});


// ------------------------------------------------------
// Calcul et affichage prix total
// ------------------------------------------------------
function updateAccessoriesTotal(products) {
    const total = products.reduce((sum, p, idx) => {
        const checkbox = document.getElementById(`accessory-${idx}`);
        if (checkbox && checkbox.checked) {
            return sum + (p.prices[0]?.price || 0);
        }
        return sum;
    }, 0);

    const totalEl = document.getElementById("accessories-total");
    const countEl = document.getElementById("accessories-count");
    const addButton = document.getElementById("add-all-accessories");
    const selectedCount = products.reduce((count, _, idx) => {
        const checkbox = document.getElementById(`accessory-${idx}`);
        return count + (checkbox?.checked ? 1 : 0);
    }, 0);
    if (totalEl) {
        totalEl.innerHTML = `<span class="js-price" data-fcfa="${total}">${total.toLocaleString()} XOF</span>`;
    }
    if (countEl) countEl.textContent = String(selectedCount);
    if (addButton) addButton.disabled = selectedCount === 0;
}

// Modifier updateTotalPrice pour utiliser la nouvelle fonction
function updateTotalPrice(products) {
    updateAccessoriesTotal(products); // On appelle la même fonction
}


// ------------------------------------------------------
// Format prix
// ------------------------------------------------------
function formatPrice(value) {
    if (!value) return "$0.00";
    return `$${(value / 100).toFixed(2)}`; // si tes prix sont en centimes
}

// ------------------------------------------------------
// Descriptions, specs
// ------------------------------------------------------

function renderProductDescription(product) {
    const descTab = document.getElementById("Jpills-two-example1");
    if (!descTab) return;

    descTab.querySelector("h3").textContent = product.name;
    descTab.querySelector("p").textContent = product.description;

    // SKU / Category / Tags
    descTab.querySelector(".sku").textContent = product.sku || "-";
    descTab.querySelector(".nav-item a.text-blue").textContent = product.category?.name || "-";
    descTab.querySelector(".tags").textContent = product.category?.slug || "_";
    // TODO : tags si disponibles
}

function renderProductSpecifications(product) {
    const specTab = document.getElementById("Jpills-three-example1");
    if (!specTab) return;

    const productTable = specTab.querySelector("table:first-of-type tbody");
    const techTable = specTab.querySelector("table:last-of-type tbody");

    // Clear existing rows
    productTable.innerHTML = "";
    techTable.innerHTML = "";

    // Exemple : specs génériques
    product.specs.forEach(s => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<th class="px-4 px-xl-5">${s.key}</th><td>${s.value}</td>`;
        techTable.appendChild(tr);
    });

    // Tu peux compléter productTable avec poids, dimensions etc.
}

// ------------------------------------------------------
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
            const prodSlug = p.slug || "";

            // ✅ Utilisation du helper pour le prix (garde ton design)
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
                        <a href="/single-product?slug=${prodSlug}" class="d-block width-75">
                            <img class="img-fluid" src="${API}/${img}" alt="${p.name}" loading="lazy" decoding="async">
                        </a>
                    </div>
                    <div class="col">
                        <h3 class="text-lh-1dot2 font-size-14 mb-0">
                            <a href="/single-product?slug=${prodSlug}">${p.name}</a>
                        </h3>
                        <div class="text-warning text-ls-n2 font-size-16 mb-1" style="width: 80px;">
                            ${starsHtml}
                        </div>
                        <div class="font-weight-bold prodcut-price product-main-price">
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

// ---------------------------------------------------
// Produits de la mm catégorie
// ---------------------------------------------------

async function loadCategoryPromoSlider(productId, containerId) {
    try {
        // 1. Récupérer le produit pour obtenir son slug
        const productRes = await fetch(`${API}/products/${productId}`);
        if (!productRes.ok) throw new Error("Erreur lors du fetch produit");
        const productData = await productRes.json();
        const slug = productData.category?.slug;
        if (!slug) throw new Error("Slug de catégorie introuvable");

        // 2. Récupérer les produits de la catégorie
        const categoryRes = await fetch(`${API}/categories/category/${slug}`);
        const categoryProducts = await categoryRes.json();

        // 3. Récupérer les promos actives
        const promoRes = await fetch(`${API}/marketing/promo/active`);
        const promos = await promoRes.json();

        // 4. Fusionner sans doublons
        const productMap = new Map();

        categoryProducts.forEach(p => {
            productMap.set(p.id, { product: p, promo: null });
        });

        promos.forEach(entry => {
            const p = entry.product;
            const promo = entry.promo;
            if (!productMap.has(p.id)) {
                productMap.set(p.id, { product: p, promo });
            } else {
                productMap.set(p.id, { product: p, promo });
            }
        });

        const products = Array.from(productMap.values());

        // 5. Injecter dans le container
        const container = document.getElementById(containerId);
        if (!container) return;

        // ✅ VIDER LE CONTENEUR
        container.innerHTML = "";

        console.log("🔍 Produits trouvés:", products);

        products.forEach(({ product, promo }) => {
            const img = product.images?.find(i => i.is_main)?.image_url?.replace(/\\/g, "/") || "placeholder.jpg";
            const price = product.prices?.[0]?.price || 0;
            const prodSlug = product.slug || "";
            const categoryName = product.category?.name || "";
            const catslug = product.category?.slug || "";

            // ✅ UTILISATION DU HELPER POUR FORMATER LE PRIX
            const priceHtml = formatProductPrice(price, promo);

            const slide = document.createElement("div");
            slide.classList.add("js-slide", "products-group");

            slide.innerHTML = `
                <div class="product-item">
                    <div class="product-item__outer h-100 w-100">
                        <div class="product-item__inner px-wd-4 p-2 p-md-3">
                            <div class="product-item__body pb-xl-2">
                                <div class="mb-2"><a href="/category-slug?slug=${catslug}" class="font-size-12 text-gray-5">${categoryName}</a></div>
                                <h5 class="mb-1 product-item__title"><a href="/single-product?slug=${prodSlug}" class="text-blue font-weight-bold">${product.name}</a></h5>
                                <div class="mb-2 product-images-wrapper">
                                    <a href="/single-product?slug=${prodSlug}" class="d-block text-center">
                                        <img class="img-fluid img-212X305 main-img" src="${API}/${img}" alt="${product.name}" loading="lazy" decoding="async">
                                    </a>
                                </div>
                                <div class="banner-overlay"></div>
                                <div class="flex-center-between mb-1">
                                    <div class="prodcut-price product-main-price">
                                        ${priceHtml}  <!-- ✅ ICI LE HELPER -->
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
                                    data-id="${product.id}">
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

        // 6. ✅ Initialiser Slick UNE SEULE FOIS après l'ajout des slides
        initCategorySlick(container);

    } catch (err) {
        console.error("Erreur chargement slider promo + catégorie", err);
    }
}

// ✅ Fonction pour initialiser Slick sur les carrousels de catégorie
function initCategorySlick(container) {
    setTimeout(() => {
        const $container = $(container);
        
        // Vérifier que le conteneur existe
        if (!container || container.children.length === 0) {
            console.warn("⚠️ Aucun slide à afficher");
            return;
        }
        
        // Vérifier si déjà initialisé
        if ($container.hasClass('slick-initialized')) {
            try {
                $container.slick('unslick');
            } catch (e) {
                console.warn("⚠️ Erreur unslick, nettoyage manuel");
                $container.removeClass('slick-initialized slick-slider');
                $container.find('.slick-list, .slick-track').remove();
            }
        }
        
        // Récupérer les options depuis data-attributes
        const slidesToShow = parseInt($container.data('slides-show') || 5);
        const slidesToScroll = parseInt($container.data('slides-scroll') || 1);
        const hasEnoughSlides = container.children.length > slidesToShow;
        
        // Utiliser HSCore si disponible
        if ($.HSCore && $.HSCore.components.HSSlickCarousel) {
            $.HSCore.components.HSSlickCarousel.init(container);
            console.log("✅ Category Slick initialisé avec HSCore");
        } else {
            // Fallback manuel avec les options du container
            $container.slick({
                slidesToShow: slidesToShow,
                slidesToScroll: slidesToScroll,
                dots: true,
                arrows: true,
                infinite: hasEnoughSlides,
                prevArrow: $container.data('arrow-left-classes') ? 
                    `<button type="button" class="${$container.data('arrow-left-classes')}"></button>` : 
                    '<button type="button" class="slick-prev">Previous</button>',
                nextArrow: $container.data('arrow-right-classes') ? 
                    `<button type="button" class="${$container.data('arrow-right-classes')}"></button>` : 
                    '<button type="button" class="slick-next">Next</button>',
                responsive: $container.data('responsive') ? 
                    JSON.parse($container.data('responsive')) : 
                    [
                        { breakpoint: 1200, settings: { slidesToShow: 4 } },
                        { breakpoint: 992, settings: { slidesToShow: 3 } },
                        { breakpoint: 768, settings: { slidesToShow: 2 } },
                        { breakpoint: 480, settings: { slidesToShow: 1 } }
                    ]
            });
            console.log("✅ Category Slick initialisé en fallback");
        }
        
        // Forcer le recalcul des dimensions après un court délai
        setTimeout(() => {
            if ($container.hasClass('slick-initialized')) {
                $container.slick('setPosition');
            }
        }, 200);
        
    }, 200);
}

// ===============================================
// GESTION DES VARIANTES
// ===============================================

let productVariants = [];
let selectedVariant = null;
let selectedRam = null;
let selectedStorage = null;
let selectedProcessor = null;

async function loadProductVariants() {
    try {
        const res = await fetch(`${API}/products/${productId}/variants`);
        if (!res.ok) {
            console.log("ℹ️ Pas de variantes pour ce produit");
            return;
        }
        
        productVariants = await res.json();
        console.log("📦 Variantes chargées:", productVariants);

        if (productData) {
            window.ProductAvailability?.index({ ...productData, variants: productVariants });
        }
        
        if (productVariants.length === 0) return;
        
        // Afficher la section variantes
        document.getElementById('variants-section').style.display = 'block';
        
        // Extraire les options uniques
        const ramOptions = [...new Set(productVariants.map(v => v.ram).filter(Boolean))];
        const storageOptions = [...new Set(productVariants.map(v => v.storage).filter(Boolean))];
        const processorOptions = [...new Set(productVariants.map(v => v.processor).filter(Boolean))];
        
        // Afficher les groupes qui ont des options
        if (ramOptions.length > 0) {
            document.getElementById('ram-group').style.display = 'block';
            renderOptions('ram', ramOptions);
        }
        
        if (storageOptions.length > 0) {
            document.getElementById('storage-group').style.display = 'block';
            renderOptions('storage', storageOptions);
        }
        
        if (processorOptions.length > 0) {
            document.getElementById('processor-group').style.display = 'block';
            renderOptions('processor', processorOptions);
        }
        
        // Sélectionner la première variante par défaut
        if (productVariants.length > 0) {
            selectVariant(productVariants[0]);
        }
        
    } catch (error) {
        console.error("❌ Erreur chargement variantes:", error);
    }
}

function renderOptions(type, options) {
    const container = document.getElementById(`${type}-options`);
    container.innerHTML = '';
    
    options.forEach(option => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'variant-option-btn';
        btn.dataset.value = option;
        btn.textContent = option;
        
        // Ajouter le prix si disponible pour cette option
        const variantsWithOption = productVariants.filter(v => v[type] === option);
        if (variantsWithOption.length === 1 && variantsWithOption[0].price) {
            const priceSpan = document.createElement('span');
            priceSpan.className = 'price-extra';
            priceSpan.textContent = ` ${variantsWithOption[0].price.toLocaleString()} XOF`;
            btn.appendChild(priceSpan);
        }
        
        btn.onclick = () => selectOption(type, option, btn);
        container.appendChild(btn);
    });
}

function selectOption(type, value, btn) {
    // Enlever la classe active de tous les boutons de ce groupe
    document.querySelectorAll(`#${type}-options .variant-option-btn`).forEach(b => {
        b.classList.remove('active');
    });
    
    // Ajouter la classe active au bouton cliqué
    btn.classList.add('active');
    
    // Mettre à jour la variable
    switch(type) {
        case 'ram':
            selectedRam = value;
            break;
        case 'storage':
            selectedStorage = value;
            break;
        case 'processor':
            selectedProcessor = value;
            break;
    }
    
    // Trouver la variante correspondante
    findMatchingVariant();
}

function findMatchingVariant() {
    // Chercher une variante qui correspond aux sélections
    const matchingVariant = productVariants.find(v => {
        return (selectedRam ? v.ram === selectedRam : true) &&
               (selectedStorage ? v.storage === selectedStorage : true) &&
               (selectedProcessor ? v.processor === selectedProcessor : true);
    });
    
    if (matchingVariant) {
        selectVariant(matchingVariant);
    }
}

function selectVariant(variant) {
    selectedVariant = variant;
    console.log("🎯 Variante sélectionnée:", variant);
    
    // ✅ Mettre à jour la quantité maximale (NOUVEAU)
    const quantityInput = document.getElementById("quantityInput");
    if (quantityInput) {
        quantityInput.max = variant.stock;  // ← Stock de la variante
        quantityInput.value = 1;  // Reset à 1
        quantityInput.min = 1;
        
        // Désactiver si stock = 0
        if (variant.stock <= 0) {
            quantityInput.disabled = true;
            document.getElementById("plusBtn").style.opacity = '0.5';
            document.getElementById("plusBtn").style.pointerEvents = 'none';
        } else {
            quantityInput.disabled = false;
            document.getElementById("plusBtn").style.opacity = '1';
            document.getElementById("plusBtn").style.pointerEvents = 'auto';
        }
    }
    
    // Mettre à jour le prix
    updatePriceForVariant(variant);
    
    // Mettre à jour le stock
    updateStockForVariant(variant);
    updateActionButton(variant.price || productData.prices?.[0]?.price || 0, Number(variant.stock) <= 0);
    
    // Activer les boutons correspondants
    if (variant.ram) {
        highlightOption('ram', variant.ram);
        selectedRam = variant.ram;
    }
    if (variant.storage) {
        highlightOption('storage', variant.storage);
        selectedStorage = variant.storage;
    }
    if (variant.processor) {
        highlightOption('processor', variant.processor);
        selectedProcessor = variant.processor;
    }
}

function highlightOption(type, value) {
    const buttons = document.querySelectorAll(`#${type}-options .variant-option-btn`);
    buttons.forEach(btn => {
        if (btn.dataset.value === value) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function updatePriceForVariant(variant) {
    const priceEl = document.getElementById("productPrice");
    if (!priceEl) return;
    
    // Vérifier si le produit a une promo
    if (productData.promoInfo?.hasPromo) {
        // Si promo, on garde le prix promo mais on pourrait ajuster
        console.log("🏷️ Prix promo existant conservé");
    } else {
        // Sinon, afficher le prix de la variante
        priceEl.innerHTML = `
            <ins class="font-size-30 text-gray-90 text-decoration-none font-weight-bold">
                <span class="js-price" data-fcfa="${variant.price}">${variant.price.toLocaleString()} XOF</span>
            </ins>
        `;
    }
}

function updateStockForVariant(variant) {
    const stockEl = document.getElementById("productStock");
    if (!stockEl) return;
    
    if (variant.stock > 0) {
        stockEl.textContent = `${variant.stock} in stock`;
        stockEl.className = 'text-green font-weight-bold';
    } else {
        stockEl.textContent = 'Rupture de stock';
        stockEl.className = 'text-danger font-weight-bold';
    }
}



// ================== INITIALISATION ==================

document.addEventListener("DOMContentLoaded", () => {
    console.log("📦 DOMContentLoaded");
    
    // Charger le produit d'abord
    loadProduct().then(() => {
        // Une fois le produit chargé, charger le reste
        if (productId) {
            loadColors();
            loadReviews();
            loadLatestProducts();
            loadCategoryPromoSlider(productId, "category-printers");
            loadProductVariants(); 
        }
    });
    // Initialiser le bouton wishlist
    setTimeout(() => {
        initWishlistButton();
    }, 500); // Petit délai pour laisser loadProduct finir
});
