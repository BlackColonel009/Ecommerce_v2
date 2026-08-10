// Badges communs du panier et des favoris.
function updateCartNav(cart = {}) {
    const items = Array.isArray(cart.items) ? cart.items : [];
    const count = items.reduce(
        (total, item) => total + (Number(item?.quantity) || 0),
        0
    );
    const total = Number(cart.total_amount) || 0;
    const formattedNumber = total.toLocaleString("fr-FR");
    const formattedTotal = `<span class="js-price" data-fcfa="${total}">${formattedNumber} <sup>XOF</sup></span>`;

    document.querySelectorAll("[data-cart-count], #cart-count, #cart-count-mobile").forEach(badge => {
        badge.textContent = count;
        badge.setAttribute("aria-label", `${count} article${count > 1 ? "s" : ""} dans le panier`);
    });

    document.querySelectorAll("[data-cart-total], #cart-total, #cart-total-mobile").forEach(element => {
        element.innerHTML = formattedTotal;
    });
}



// wishlist_utils.js
function updateWishlistNav(favorites = []) {
  const entries = Array.isArray(favorites)
    ? favorites
    : (Array.isArray(favorites.items) ? favorites.items : []);
  const count = entries.length;

  document.querySelectorAll("[data-wishlist-count], #wishlist-count, #wishlist-count-mobile").forEach(badge => {
    badge.textContent = count;
    badge.setAttribute("aria-label", `${count} produit${count > 1 ? "s" : ""} favori${count > 1 ? "s" : ""}`);
  });
}

async function refreshCartBadge() {
  try {
    const res = await fetch(`${API}/cart/`, { credentials: "include" });
    if (res.status === 404) {
      const emptyCart = { items: [], total_amount: 0 };
      updateCartNav(emptyCart);
      return emptyCart;
    }
    if (!res.ok) throw new Error(`Panier indisponible (${res.status})`);
    const cart = await res.json();
    updateCartNav(cart);
    return cart;
  } catch (err) {
    console.error("[refreshCartBadge]", err);
    return null;
  }
}

async function refreshWishlistBadge() {
  try {
    const res = await fetch(`${API}/favorites/`, { credentials: "include" });
    if (!res.ok) throw new Error(`Favoris indisponibles (${res.status})`);
    const favorites = await res.json();
    updateWishlistNav(favorites);
    return favorites;
  } catch (err) {
    console.error("[refreshWishlistBadge]", err);
    return null;
  }
}

async function refreshNavigationBadges() {
  await Promise.allSettled([refreshCartBadge(), refreshWishlistBadge()]);
}

window.updateCartNav = updateCartNav;
window.updateWishlistNav = updateWishlistNav;
window.refreshCartBadge = refreshCartBadge;
window.refreshWishlistBadge = refreshWishlistBadge;
window.refreshNavigationBadges = refreshNavigationBadges;

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
          await refreshWishlistBadge();
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
          await refreshCartBadge();
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

async function loadWishlistUP() {
    attachRemoveEvents();
    attachCartEvents();
    await refreshWishlistBadge();
}

function showAlert(message, type="success") {
  alert(message); // version simple
}

// Fonction pour ajouter aux favoris
async function addToFavorites(productId) {
  try {
    const res = await fetch(`${API}/favorites/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId }),
      credentials: "include" // envoie le cookie device_id
    });

    if (!res.ok) throw new Error("Erreur ajout favoris");
    const fav = await res.json();
    console.log("Ajouté aux favoris:", fav);
    await refreshWishlistBadge();
    showAlert("Produit ajouté à la wishlist !");
  } catch (err) {
    console.error(err);
    showAlert("Erreur lors de l'ajout aux favoris", "error");
  }
}


// Attacher les événements aux boutons
document.addEventListener("click", function(e) {
  if (e.target.closest(".wishlist-btn")) {
    const btn = e.target.closest(".wishlist-btn");
    const productId = btn.dataset.id;
    addToFavorites(productId);
  }

});
document.addEventListener("DOMContentLoaded", refreshNavigationBadges);

// État de disponibilité commun à toutes les cartes produit et à tous les Slick.
(function initProductAvailability() {
  if (window.ProductAvailability) return;

  const products = new Map();
  const originalFetch = window.fetch.bind(window);
  let scanFrame = null;

  function numericStock(value) {
    if (value === null || value === undefined || value === "") return null;
    const stock = Number(value);
    return Number.isFinite(stock) ? stock : null;
  }

  function getStock(product) {
    if (!product || typeof product !== "object") return null;

    if (Array.isArray(product.variants) && product.variants.length) {
      const variantStocks = product.variants
        .map(variant => numericStock(variant?.quantity ?? variant?.stock ?? variant?.inventory?.quantity))
        .filter(stock => stock !== null);
      if (variantStocks.length) return variantStocks.reduce((total, stock) => total + stock, 0);
    }

    return numericStock(product.inventory?.quantity ?? product.stock_quantity ?? product.stock);
  }

  function isProduct(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const hasIdentity = value.id !== undefined && (value.slug || value.name);
    const hasCatalogData = value.images !== undefined || value.prices !== undefined || value.category !== undefined;
    const hasStockData = value.inventory !== undefined || value.variants !== undefined || value.stock_quantity !== undefined || value.stock !== undefined;
    return Boolean(hasIdentity && hasCatalogData && hasStockData);
  }

  function productKey(type, value) {
    return value === null || value === undefined ? null : `${type}:${String(value).trim().toLowerCase()}`;
  }

  function remember(product) {
    const idKey = productKey("id", product.id);
    const slugKey = productKey("slug", product.slug);
    if (idKey) products.set(idKey, product);
    if (slugKey) products.set(slugKey, product);
  }

  function indexPayload(payload, seen = new WeakSet()) {
    if (!payload || typeof payload !== "object" || seen.has(payload)) return;
    seen.add(payload);

    if (isProduct(payload)) remember(payload);
    if (Array.isArray(payload)) {
      payload.forEach(item => indexPayload(item, seen));
    } else {
      Object.values(payload).forEach(value => indexPayload(value, seen));
    }
  }

  function productFromCard(card) {
    const directId = card.dataset.productId;
    if (directId) {
      const directProduct = products.get(productKey("id", directId));
      if (directProduct) return directProduct;
    }

    const link = card.querySelector('a[href*="/single-product"]');
    if (!link) return null;

    try {
      const url = new URL(link.getAttribute("href"), window.location.origin);
      const slug = url.searchParams.get("slug");
      const id = url.searchParams.get("id");
      return products.get(productKey("slug", slug)) || products.get(productKey("id", id)) || null;
    } catch (_) {
      return null;
    }
  }

  function makeSoldOut(card, product) {
    if (card.classList.contains("nt-product-sold-out")) return;

    card.classList.add("nt-product-sold-out");
    card.dataset.productId = product.id;

    const stampHost = card.tagName === "TR"
      ? (card.querySelector("td:nth-child(2)") || card.querySelector("td"))
      : card;
    stampHost?.classList.add("nt-sold-stamp-host");

    if (stampHost && !stampHost.querySelector(":scope > .nt-product-sold-stamp")) {
      const stamp = document.createElement("span");
      stamp.className = "nt-product-sold-stamp";
      stamp.textContent = "Vendu";
      stamp.setAttribute("aria-label", "Produit vendu");
      stampHost.prepend(stamp);
    }

    const currentAction = card.querySelector(".btn-add-cart, .add-to-cart-btn");
    if (currentAction && !currentAction.classList.contains("nt-order-whatsapp")) {
      currentAction.parentElement?.classList.remove("d-none", "d-xl-block");
      const whatsappAction = document.createElement(currentAction.tagName.toLowerCase());
      whatsappAction.className = "nt-order-whatsapp";
      whatsappAction.dataset.productId = product.id;
      whatsappAction.innerHTML = '<i class="fab fa-whatsapp" aria-hidden="true"></i><span>Passer la commande</span>';
      whatsappAction.setAttribute("aria-label", `Passer la commande WhatsApp pour ${product.name || "ce produit"}`);
      if (whatsappAction.tagName === "A") whatsappAction.href = "#";
      if (whatsappAction.tagName === "BUTTON") whatsappAction.type = "button";
      currentAction.replaceWith(whatsappAction);
    }
  }

  function decorateCard(card) {
    const product = productFromCard(card);
    if (!product || getStock(product) !== 0) return;
    makeSoldOut(card, product);
  }

  function scanCards(root = document) {
    const selector = "[data-product-card], .product-item__outer, .product-list-hover, tr[data-product-id]";
    if (root instanceof Element && root.matches(selector)) decorateCard(root);
    root.querySelectorAll?.(selector).forEach(decorateCard);
  }

  function scheduleScan() {
    if (scanFrame !== null) return;
    scanFrame = window.requestAnimationFrame(() => {
      scanFrame = null;
      scanCards();
    });
  }

  function setSingleProductState(soldOut) {
    const container = document.getElementById("single-product-container");
    if (!container) return;

    container.classList.toggle("nt-single-product-sold-out", Boolean(soldOut));
    let stamp = container.querySelector(".nt-single-product-sold-stamp");
    if (soldOut && !stamp) {
      stamp = document.createElement("span");
      stamp.className = "nt-single-product-sold-stamp";
      stamp.textContent = "Vendu";
      const galleryHost = document.getElementById("sliderSyncingNav")?.parentElement;
      galleryHost?.classList.add("nt-sold-stamp-host");
      galleryHost?.prepend(stamp);
    } else if (!soldOut && stamp) {
      stamp.remove();
    }
  }

  window.fetch = async function availabilityFetch(...args) {
    const response = await originalFetch(...args);
    const contentType = response.headers.get("content-type") || "";
    if (response.ok && contentType.includes("application/json")) {
      response.clone().json().then(payload => {
        indexPayload(payload);
        scheduleScan();
      }).catch(() => {});
    }
    return response;
  };

  window.ProductAvailability = {
    getStock,
    isSoldOut: product => getStock(product) === 0,
    index: payload => { indexPayload(payload); scheduleScan(); },
    scan: scheduleScan,
    setSingleProductState
  };

  document.addEventListener("click", async event => {
    const action = event.target.closest(".nt-order-whatsapp");
    if (!action) return;
    event.preventDefault();
    if (action.getAttribute("aria-busy") === "true") return;

    const productId = action.dataset.productId;
    const popup = window.open("", "_blank");
    action.setAttribute("aria-busy", "true");
    action.classList.add("is-loading");

    try {
      const response = await originalFetch(`${API}/cart/${productId}/whatsapp`, { credentials: "include" });
      if (!response.ok) throw new Error(`WhatsApp indisponible (${response.status})`);
      const data = await response.json();
      if (!data.whatsapp_url) throw new Error("Lien WhatsApp indisponible");

      if (popup) popup.location.replace(data.whatsapp_url);
      else window.location.href = data.whatsapp_url;
    } catch (error) {
      popup?.close();
      console.error("[ProductAvailability]", error);
      window.alert("Impossible d’ouvrir WhatsApp pour le moment.");
    } finally {
      action.removeAttribute("aria-busy");
      action.classList.remove("is-loading");
    }
  });

  function observeCards() {
    scanCards();
    new MutationObserver(mutations => {
      // Slick ajoute et retire de nombreux clones. Un scan complet du document
      // à chaque mutation peut saturer le thread principal sur la boutique.
      // On ne traite ici que les nouveaux sous-arbres concernés.
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node instanceof Element) scanCards(node);
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", observeCards, { once: true });
  else observeCards();
})();

// Panneau éditorial/promotionnel partagé par toutes les pages e-commerce.
(() => {
  if (!document.querySelector('link[data-nt-context-rail]')) {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = '/static/css/context-rail.css?v=20260809';
    style.dataset.ntContextRail = 'true';
    document.head.appendChild(style);
  }
  if (!document.querySelector('script[data-nt-context-rail]')) {
    const script = document.createElement('script');
    script.src = '/static/js/context-rail.js?v=20260809';
    script.defer = true;
    script.dataset.ntContextRail = 'true';
    document.head.appendChild(script);
  }
})();
