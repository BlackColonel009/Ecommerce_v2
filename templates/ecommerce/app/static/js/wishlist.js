

// Utilitaire pour lire un cookie
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return null;
}

function showAlert(message, type="success") {
  alert(message); // version simple
}

// Charger la wishlist
async function loadWishlist() {
    try {
        const res = await fetch(`${API}/favorites/`, { credentials: "include" });

        if (!res.ok) throw new Error("Erreur chargement favoris");
        const favorites = await res.json();

        const tbody = document.querySelector(".wishlist-table tbody");
        tbody.innerHTML = "";

        for (const fav of favorites) {
            const product = fav.product;
            
            // ✅ Charger les variantes du produit
            let variants = [];
            let hasVariants = false;
            try {
                const variantsRes = await fetch(`${API}/products/${product.id}/variants`);
                if (variantsRes.ok) {
                    variants = await variantsRes.json();
                    hasVariants = variants.length > 0;
                }
            } catch (e) {
                console.log("ℹ️ Pas de variantes pour ce produit");
            }

            const row = document.createElement("tr");
            row.dataset.productId = product.id;
            row.dataset.favoriteId = fav.id;

            // ✅ Déterminer le stock et le prix à afficher
            let stockStatus = "Rupture de stock";
            let stockClass = "text-danger";
            let displayPrice = product.prices?.[0]?.price || 0;
            let variantSelector = "";

            if (hasVariants) {
                // ✅ Produit avec variantes
                const totalStock = variants.reduce((sum, v) => sum + v.quantity, 0);
                const inStockVariants = variants.filter(v => v.quantity > 0);
                
                if (inStockVariants.length > 0) {
                    stockStatus = `${inStockVariants.length} variante(s) disponible(s)`;
                    stockClass = "text-success";
                    
                    // Prix minimum des variantes en stock
                    const minPrice = Math.min(...inStockVariants.map(v => v.price));
                    displayPrice = minPrice;
                    
                    // ✅ Sélecteur de variante
                    variantSelector = `
                        <div class="variant-selector mt-2">
                            <select class="form-control form-control-sm variant-select" data-product-id="${product.id}">
                                <option value="">Choisir une variante</option>
                                ${variants.map(v => `
                                    <option value="${v.id}" 
                                            data-price="${v.price}"
                                            data-stock="${v.quantity}"
                                            ${v.quantity === 0 ? 'disabled' : ''}>
                                        ${v.ram || ''} ${v.storage || ''} ${v.processor || ''} - 
                                        ${v.price.toLocaleString()} XOF 
                                        (${v.quantity > 0 ? 'stock: ' + v.quantity : 'rupture'})
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    `;
                }
            } else {
                // ✅ Produit simple
                const stockQty = product.inventory?.quantity || 0;
                stockStatus = stockQty > 0 ? `${stockQty} en stock` : "Rupture de stock";
                stockClass = stockQty > 0 ? "text-success" : "text-danger";
                displayPrice = product.prices?.[0]?.price || 0;
            }

            // Partager le stock réel des variantes avec l'affichage global des produits.
            window.ProductAvailability?.index({
                ...product,
                variants: hasVariants ? variants : product.variants
            });

            row.innerHTML = `
                <td class="text-center">
                    <a href="#" class="remove-favorite text-gray-32 font-size-26">×</a>
                </td>
                <td class="d-none d-md-table-cell">
                    <a href="/single-product?id=${product.id}">
                        <img class="img-fluid max-width-100 p-1 border border-color-1" 
                             src="${API.replace('/favorites','')}/${product.images?.[0]?.image_url || 'uploads/products/demo-placeholders/demo-accessory.webp'}" 
                             alt="${product.name}" loading="lazy" decoding="async">
                    </a>
                </td>
                <td data-title="Product">
                    <a href="/single-product?id=${product.id}" class="text-gray-90">${product.name}</a>
                    ${hasVariants ? '<span class="badge badge-info ml-2">Variantes</span>' : ''}
                    ${variantSelector}
                </td>
                <td data-title="Unit Price">
                    <span class="product-price-${product.id}">${displayPrice.toLocaleString()} XOF</span>
                    ${hasVariants ? '<small class="d-block text-muted">À partir de</small>' : ''}
                </td>
                <td data-title="Stock Status">
                    <span class="${stockClass} stock-status-${product.id}">${stockStatus}</span>
                </td>
                <td>
                    <button type="button" 
                            class="add-to-cart-btn btn btn-soft-secondary mb-3 mb-md-0 font-weight-normal px-5 px-md-4 px-lg-5 w-100 w-md-auto text-dark btn-prestige-3d primary"
                            data-product-id="${product.id}"
                            data-has-variants="${hasVariants}">
                        Ajouter au panier
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        }

        attachRemoveEvents();
        attachVariantEvents(); // ✅ Nouvelle fonction
        attachCartEvents();
        updateWishlistNav(favorites);

    } catch (err) {
        console.error("❌ Erreur wishlist:", err);
    }
}

// ✅ Gérer le changement de variante
function attachVariantEvents() {
    document.querySelectorAll('.variant-select').forEach(select => {
        select.addEventListener('change', function(e) {
            const productId = this.dataset.productId;
            const selectedOption = this.options[this.selectedIndex];
            
            if (selectedOption.value) {
                // Mettre à jour le prix affiché
                const price = selectedOption.dataset.price;
                document.querySelector(`.product-price-${productId}`).textContent = 
                    `${parseInt(price).toLocaleString()} XOF`;
                
                // Mettre à jour le stock
                const stock = selectedOption.dataset.stock;
                const stockEl = document.querySelector(`.stock-status-${productId}`);
                if (stock > 0) {
                    stockEl.textContent = `${stock} en stock`;
                    stockEl.className = 'text-success';
                } else {
                    stockEl.textContent = 'Rupture de stock';
                    stockEl.className = 'text-danger';
                }
            }
        });
    });
}

// ✅ Modifier l'ajout au panier pour gérer les variantes
function attachCartEvents() {
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            
            const productId = this.dataset.productId;
            const hasVariants = this.dataset.hasVariants === 'true';
            
            let variantId = null;
            
            if (hasVariants) {
                // Récupérer la variante sélectionnée
                const select = document.querySelector(`.variant-select[data-product-id="${productId}"]`);
                if (!select || !select.value) {
                    alert("Veuillez sélectionner une variante");
                    return;
                }
                variantId = parseInt(select.value);
            }
            
            // Ajouter au panier
            const payload = variantId 
                ? { variant_id: variantId, quantity: 1 }
                : { product_id: parseInt(productId), quantity: 1 };
            
            try {
                const res = await fetch(`${API}/cart/add`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                    credentials: "include"
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
        });
    });
}

// Attacher les événements de suppression
function attachRemoveEvents() {
  document.querySelectorAll(".remove-favorite").forEach(btn => {
    btn.addEventListener("click", async e => {
      e.preventDefault();
      const row = btn.closest("tr");
      const favoriteId = row.dataset.favoriteId; // <-- utiliser l'id du favori

      try {
        const res = await fetch(`${API}/favorites/${favoriteId}`, {
          method: "DELETE",
          credentials: "include"
        });
        if (res.ok) {
          row.remove();
          if (typeof window.refreshWishlistBadge === "function") {
            await window.refreshWishlistBadge();
          }
        } else {
          console.error("Erreur suppression favori");
        }
      } catch (err) {
        console.error(err);
      }
    });
  });
}

function attachCartEvents() {
  document.querySelectorAll(".add-to-cart-btn").forEach(btn => {
    btn.addEventListener("click", async e => {
      e.preventDefault();
      const row = btn.closest("tr");
      const productId = row.dataset.productId; // récupère l'id produit

      // Par défaut on met quantité = 1
      const payload = {
        product_id: parseInt(productId),
        quantity: 1,
        color_id: null // si tu veux gérer les couleurs plus tard
      };

      try {
        const res = await fetch(`${API}/cart/add`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include"
        });

        if (res.ok) {
          if (typeof window.refreshCartBadge === "function") {
            await window.refreshCartBadge();
          }
          alert("Produit ajouté au panier !");
        } else {
          alert("Erreur lors de l'ajout au panier");
        }
      } catch (err) {
        console.error("Erreur réseau:", err);
      }
    });
  });
}

// Initialisation
document.addEventListener("DOMContentLoaded", loadWishlist);
