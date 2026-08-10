// Charger le panier. La mise à jour des badges est centralisée dans cart_utils.js.
const cartQuantityQueues = new Map();
const cartDesiredQuantities = new Map();

async function loadCart() {
    try {
        const res = await fetch(`${API}/cart/`, {
            method: "GET",
            credentials: "include"   
        });
        if (res.status === 404) {
            const emptyCart = { items: [], total_amount: 0 };
            renderCart(emptyCart);
            updateCartNav(emptyCart);
            return;
        }
        if (!res.ok) throw new Error("Erreur chargement panier");
        const cart = await res.json();
        renderCart(cart);
        updateCartNav(cart); // ✅ met à jour le nav

    } catch (err) {
        console.error("[loadCart] Erreur:", err);
    }
}


// Afficher le panier dans le template
function renderCart(cart) {
    const tbody = document.querySelector("#cartTableBody");
    if (!tbody || !Array.isArray(cart?.items)) return;
    tbody.innerHTML = "";

    cart.items.forEach(item => {
        if (!cartQuantityQueues.has(String(item.id))) {
            cartDesiredQuantities.set(String(item.id), Math.max(1, Number(item.quantity) || 1));
        }
        // ✅ Vérifier si c'est une variante ou un produit simple
        const isVariant = item.variant_id && item.variant;
        const isProduct = item.product_id && item.product;
        
        let product = null;
        let variant = null;
        let name = "";
        let imageUrl = "";
        let brandName = "";
        let categoryName = "";
        let originalPrice = 0;
        let productSlug = "";
        let isPriceOnDemand = false;
        
        if (isVariant) {
            variant = item.variant;
            product = variant.product;
            
            if (!product) {
                console.error("❌ Produit non trouvé pour la variante", variant);
                return;
            }
            
            name = `${product.name} (${variant.ram || ''} ${variant.storage || ''})`;
            imageUrl = product.images?.find(img => img.is_main)?.image_url?.replace(/\\/g, "/") 
                    || "/static/img/placeholder.png";
            brandName = product.brand?.name || "";
            categoryName = product.category?.name || "";
            originalPrice = variant.price;
            productSlug = product.slug;
            
            // ✅ Vérifier si c'est un prix sur demande
            isPriceOnDemand = variant.price <= 0;

        } else if (isProduct) {
            product = item.product;
            
            if (!product) {
                console.error("❌ Produit non trouvé", item);
                return;
            }
            
            name = product.name;
            imageUrl = product.images?.find(img => img.is_main)?.image_url?.replace(/\\/g, "/")
                      || product.images?.[0]?.image_url?.replace(/\\/g, "/")
                      || "/static/img/placeholder.png";
            brandName = product.brand?.name || "";
            categoryName = product.category?.name || "";
            originalPrice = product.prices?.length ? product.prices[0].price : 0;
            productSlug = product.slug;
            
            // ✅ Vérifier si c'est un prix sur demande
            isPriceOnDemand = originalPrice <= 0;
        } else {
            console.warn("⚠️ Item ignoré - ni produit ni variante", item);
            return;
        }
        
        const price = item.price;
        const isPromo = originalPrice > price && originalPrice > 0;

        // ✅ Construction de l'affichage du prix
        let priceDisplay = '';
        if (isPriceOnDemand) {
            priceDisplay = `<span class="text-muted"><i class="fas fa-phone-alt mr-1"></i>Prix sur demande</span>`;
        } else if (isPromo) {
            priceDisplay = `
                <div class="d-flex flex-column">
                    <del class="small text-gray-2"><span class="js-price" data-fcfa="${originalPrice}">${originalPrice.toLocaleString()} XOF</span></del>
                    <span class="font-weight-bold text-red"><span class="js-price" data-fcfa="${price}">${price.toLocaleString()} XOF</span></span>
                </div>
            `;
        } else {
            priceDisplay = `<span class="font-weight-bold"><span class="js-price" data-fcfa="${price}">${price.toLocaleString()} XOF</span></span>`;
        }

        const row = document.createElement("tr");
        row.innerHTML = `
            <td class="text-center">
                <a href="javascript:;" class="text-gray-32 font-size-26 btn-delete" data-id="${item.id}">×</a>
            </td>
            <td class="d-none d-md-table-cell">
                <a href="/single-product?slug=${productSlug}">
                    <img class="img-fluid max-width-100 p-1 border border-color-1"
                         src="${API}/${imageUrl}" 
                         alt="${name}"
                         onerror="this.src='/static/img/placeholder.png'">
                </a>
            </td>
            <td data-title="Product">
                <a href="/single-product?slug=${productSlug}" class="text-gray-90">${name}</a>
                <br>
                <small class="text-muted">${brandName} | ${categoryName}</small>
                ${item.variant_id ? '<span class="badge badge-info ml-2">Variante</span>' : ''}
                ${isPromo ? '<span class="badge badge-danger ml-2">Promo</span>' : ''}
                ${isPriceOnDemand ? '<span class="badge badge-warning ml-2">Sur demande</span>' : ''}
            </td>
            <td data-title="Price">
                ${priceDisplay}
            </td>
            <td data-title="Quantity">
                <div class="border rounded-pill py-1 width-122 w-xl-80 px-3 border-color-1">
                    <div class="js-quantity row align-items-center">
                        <div class="col">
                            <input class="js-result form-control h-auto border-0 rounded p-0 shadow-none"
                                   type="text" value="${item.quantity}" readonly>
                        </div>
                        <div class="col-auto pr-1">
                            <button type="button" class="nt-cart-minus btn btn-icon btn-xs btn-outline-secondary rounded-circle border-0 btn-update"
                               data-id="${item.id}" data-action="decrease" ${item.quantity <= 1 ? 'disabled aria-disabled="true"' : ''}>
                                <small class="fas fa-minus btn-icon__inner"></small>
                            </button>
                            <button type="button" class="nt-cart-plus btn btn-icon btn-xs btn-outline-secondary rounded-circle border-0 btn-update"
                               data-id="${item.id}" data-action="increase">
                                <small class="fas fa-plus btn-icon__inner"></small>
                            </button>
                        </div>
                    </div>
                </div>
            </td>
            <td data-title="Total">
                ${isPriceOnDemand 
                    ? `<span class="text-muted"><i class="fas fa-phone-alt mr-1"></i>Sur demande</span>`
                    : `<span class="font-weight-bold"><span class="js-price" data-fcfa="${item.total}">${item.total.toLocaleString()} XOF</span></span>`
                }
            </td>
        `;

        tbody.appendChild(row);
    });

    // Mettre à jour les totaux
    const subtotalEl = document.querySelector("#cartSubtotal");
    if (subtotalEl) {
        subtotalEl.innerHTML = `<span class="js-price" data-fcfa="${cart.total_amount}">${cart.total_amount.toLocaleString()} XOF</span>`;
    }

    const shippingEl = document.querySelector("#cartShipping");
    if (shippingEl) {
        shippingEl.textContent = "Indisponible pour le moment contactez Whatsapp";
    }

    const totalEl = document.querySelector("#cartTotal");
    if (totalEl) {
        totalEl.innerHTML = `<span class="js-price" data-fcfa="${cart.total_amount}">${cart.total_amount.toLocaleString()} XOF</span>`;
    }
}


// Mettre à jour la quantité
async function updateItemQuantity(itemId, newQuantity) {
    const res = await fetch(`${API}/cart/item/${itemId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quantity: newQuantity }),
            credentials: "include"
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.detail || "Impossible de modifier la quantité");
    }
    renderCart(data);
    updateCartNav(data);
    return data;
}

function queueQuantityUpdate(itemId, newQuantity) {
    const key = String(itemId);
    cartDesiredQuantities.set(key, Math.max(1, newQuantity));
    const previous = cartQuantityQueues.get(key) || Promise.resolve();
    const next = previous
        .catch(() => {})
        .then(() => updateItemQuantity(key, cartDesiredQuantities.get(key)))
        .catch(async (error) => {
            console.error("[updateItemQuantity] Erreur:", error);
            showLocationNotification(error.message, "error");
            await loadCart();
        })
        .finally(() => {
            if (cartQuantityQueues.get(key) === next) cartQuantityQueues.delete(key);
        });
    cartQuantityQueues.set(key, next);
    return next;
}

// Supprimer un item
async function deleteItem(itemId) {
    try {
        // Désactiver le bouton pendant la suppression
        const deleteBtn = document.querySelector(`.btn-delete[data-id="${itemId}"]`);
        if (deleteBtn) {
            deleteBtn.style.opacity = '0.5';
            deleteBtn.style.pointerEvents = 'none';
            deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }

        const res = await fetch(`${API}/cart/item/${itemId}`, { 
            method: "DELETE", 
            credentials: "include" 
        });
        const cart = await res.json();
        renderCart(cart);
        updateCartNav(cart);

    } catch (err) {
        console.error("[deleteItem] Erreur:", err);
        alert("Erreur lors de la suppression");
        
        // Réactiver le bouton en cas d'erreur
        const deleteBtn = document.querySelector(`.btn-delete[data-id="${itemId}"]`);
        if (deleteBtn) {
            deleteBtn.style.opacity = '1';
            deleteBtn.style.pointerEvents = 'auto';
            deleteBtn.innerHTML = '×';
        }
    }
}

// Vider le panier
async function clearCart() {
    try {
        const res = await fetch(`${API}/cart/clear`, { method: "DELETE", credentials: "include"  });
        const cart = await res.json();
        renderCart(cart);
        updateCartNav(cart); // ✅ met à jour le nav

    } catch (err) {
        console.error("[clearCart] Erreur:", err);
    }
}

// Notes du panier
async function updateCartNotes(notes) {
    try {
        const res = await fetch(`${API}/cart/notes`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notes }),
            credentials: "include" 
        });
        const cart = await res.json();
        renderCart(cart);
    } catch (err) {
        console.error("[updateCartNotes] Erreur:", err);
    }
}

// Variables globales
let userLocation = null;
let locationMethod = null; // 'gps' ou 'manual'

// Modifier la fonction checkoutWhatsApp
async function checkoutWhatsApp() {
    try {
        // Afficher le modal de localisation
        $('#locationModal').modal('show');
        
    } catch (err) {
        console.error("[checkoutWhatsApp] Erreur:", err);
        // Fallback : ouvrir directement WhatsApp sans localisation
        directWhatsAppCheckout();
    }
}

// Initialisation du modal
document.addEventListener('DOMContentLoaded', () => {
    initLocationModal();
});

function initLocationModal() {
    const shareBtn = document.getElementById('shareLocationBtn');
    const confirmBtn = document.getElementById('confirmLocationBtn');
    const skipBtn = document.getElementById('skipLocationBtn');
    const manualLink = document.getElementById('manualLocationLink');
    const manualInput = document.getElementById('manualAddressInput');
    const submitManual = document.getElementById('submitManualAddress');
    const locationStatus = document.getElementById('locationStatus');
    const locationCoordinates = document.getElementById('locationCoordinates');
    const coordsDisplay = document.getElementById('coordsDisplay');

    // Continuer la commande même si le client ne souhaite pas partager sa position.
    skipBtn.addEventListener('click', () => {
        userLocation = null;
        locationMethod = null;
        $('#locationModal').modal('hide');
        proceedToWhatsAppWithLocation();
    });
    
    // Partager la position GPS
    shareBtn.addEventListener('click', () => {
        if (navigator.geolocation) {
            locationStatus.style.display = 'block';
            shareBtn.disabled = true;
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    // Succès
                    userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        method: 'gps'
                    };
                    locationMethod = 'gps';
                    
                    // Afficher les coordonnées
                    coordsDisplay.textContent = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
                    locationCoordinates.style.display = 'block';
                    
                    // Cacher le status
                    locationStatus.style.display = 'none';
                    
                    // Changer les boutons
                    shareBtn.style.display = 'none';
                    confirmBtn.style.display = 'inline-block';
                    
                    // Animation de succès
                    showLocationNotification('✅ Position récupérée avec succès', 'success');
                },
                (error) => {
                    // Erreur
                    locationStatus.style.display = 'none';
                    shareBtn.disabled = false;
                    
                    let errorMsg = "Impossible de récupérer votre position";
                    if (error.code === 1) errorMsg = "❌ Vous avez refusé la géolocalisation";
                    if (error.code === 2) errorMsg = "❌ Position indisponible";
                    if (error.code === 3) errorMsg = "❌ Délai d'attente dépassé";
                    
                    showLocationNotification(errorMsg, 'error');
                    
                    // Proposer l'entrée manuelle
                    manualInput.style.display = 'block';
                }
            );
        } else {
            showLocationNotification("❌ Géolocalisation non supportée", 'error');
            manualInput.style.display = 'block';
        }
    });
    
    // Confirmer et envoyer la commande
    confirmBtn.addEventListener('click', () => {
        $('#locationModal').modal('hide');
        proceedToWhatsAppWithLocation();
    });
    
    // Lien pour entrée manuelle
    manualLink.addEventListener('click', (e) => {
        e.preventDefault();
        manualInput.style.display = 'block';
        shareBtn.style.display = 'none';
        locationStatus.style.display = 'none';
    });
    
    // Soumettre adresse manuelle
    submitManual.addEventListener('click', () => {
        const address = document.getElementById('manualAddress').value.trim();
        if (address) {
            userLocation = {
                address: address,
                method: 'manual'
            };
            locationMethod = 'manual';
            showLocationNotification(`📍 Adresse: ${address}`, 'info');
            
            $('#locationModal').modal('hide');
            proceedToWhatsAppWithLocation();
        } else {
            showLocationNotification("Veuillez entrer une adresse", 'error');
        }
    });
}


// Procéder à l'envoi WhatsApp avec localisation

// Procéder à l'envoi WhatsApp avec localisation
async function proceedToWhatsAppWithLocation() {
    // Sauvegarder l'état du bouton pour le feedback utilisateur
    const checkoutBtn = document.getElementById("checkoutBtn");
    const originalBtnHTML = checkoutBtn ? checkoutBtn.innerHTML : null;
    
    try {
        // Feedback utilisateur : désactiver le bouton et afficher chargement
        if (checkoutBtn) {
            checkoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Préparation...';
            checkoutBtn.disabled = true;
        }
        
        // Récupérer les notes du formulaire
        const notes = document.querySelector("#notesInput")?.value || "";
        
        // Construire l'URL avec les paramètres
        let url = `${API}/cart/whatsapp?notes=${encodeURIComponent(notes)}`;
        
        // Ajouter la localisation si disponible
        if (userLocation) {
            if (userLocation.method === 'gps') {
                url += `&lat=${userLocation.lat}&lng=${userLocation.lng}`;
            } else if (userLocation.method === 'manual') {
                url += `&address=${encodeURIComponent(userLocation.address)}`;
            }
        }
        
        // 1️⃣ Appel API (GET) avec les paramètres
        const res = await fetch(url, {
            method: "GET",
            credentials: "include"
        });
        
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Erreur API (${res.status}): ${errorText}`);
        }
        
        const data = await res.json();
        
        // 2️⃣ Vérifier que l'URL WhatsApp est présente
        if (!data || !data.whatsapp_url) {
            throw new Error("Réponse API invalide");
        }
        
        // 3️⃣ Ouvrir WhatsApp dans un nouvel onglet
        window.open(data.whatsapp_url, "_blank");
        
        // 4️⃣ Réinitialiser la localisation après envoi
        userLocation = null;
        
        // 5️⃣ Notification de succès
        showLocationNotification("✅ Commande préparée avec succès !", "success");
        
    } catch (err) {
        console.error("[proceedToWhatsAppWithLocation] ❌ Erreur:", err);
        
        // Notification d'erreur
        showLocationNotification(`❌ ${err.message}`, "error");
        
        // Fallback : essayer sans localisation
        try {
            await directWhatsAppCheckout();
        } catch (fallbackErr) {
            console.error("[Fallback] ❌ Échec également:", fallbackErr);
            showLocationNotification("❌ Impossible d'ouvrir WhatsApp", "error");
        }
        
    } finally {
        // Restaurer le bouton dans tous les cas
        if (checkoutBtn && originalBtnHTML) {
            checkoutBtn.innerHTML = originalBtnHTML;
            checkoutBtn.disabled = false;
        }
    }
}

// Fallback sans localisation (inchangé)
async function directWhatsAppCheckout() {
    const notes = document.querySelector("#notesInput")?.value || "";
    const res = await fetch(`${API}/cart/whatsapp?notes=${encodeURIComponent(notes)}`, {
        method: "GET",
        credentials: "include"
    });
    const data = await res.json();
    window.open(data.whatsapp_url, "_blank");
}


// Notifications chic
function showLocationNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="close" data-dismiss="alert">&times;</button>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 5000);
}



// Initialisation
document.addEventListener("DOMContentLoaded", () => {
    loadCart();

    // Gestion des clics pour les boutons de mise à jour
    document.body.addEventListener("click", (e) => {
        const btn = e.target.closest(".btn-update");
        if (btn) {
            e.preventDefault();
            const id = btn.dataset.id;
            const action = btn.dataset.action;
            const row = btn.closest("tr");

            const input = row.querySelector(".js-result");
            const key = String(id);
            let qty = cartDesiredQuantities.get(key) ?? parseInt(input.value, 10);

            if (isNaN(qty)) {
                console.error("❌ Quantité invalide", input.value);
                return;
            }

            if (action === "decrease") {
                qty = Math.max(1, qty - 1);
            } else {
                qty += 1;
            }

            // Mise à jour visuelle immédiate
            input.value = qty;

            // Appel API
            cartDesiredQuantities.set(key, qty);
            row.querySelector(".nt-cart-minus")?.toggleAttribute("disabled", qty <= 1);
            queueQuantityUpdate(id, qty);
        }

        // ✅ Gestion des clics pour les boutons de suppression
        const deleteBtn = e.target.closest(".btn-delete");
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            
            // Optionnel : Demander confirmation
            if (confirm("Voulez-vous vraiment supprimer cet article ?")) {
                deleteItem(id);
            }
        }
    });

    document.querySelector("#clearCartBtn")?.addEventListener("click", clearCart);
    document.querySelector("#checkoutBtn")?.addEventListener("click", checkoutWhatsApp);
    document.querySelector("#notesForm")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const notes = document.querySelector("#notesInput").value;
        updateCartNotes(notes);
    });
});


