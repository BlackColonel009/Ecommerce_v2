// ------------------------------------------------------
// DEBOUNCE FUNCTION
// ------------------------------------------------------
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ------------------------------------------------------
// FONCTIONS UTILITAIRES GÉNÉRIQUES
// ------------------------------------------------------
function saveSearch(query) {
    try {
        let history = JSON.parse(localStorage.getItem("searchHistory")) || [];
        history = history.filter(item => item !== query);
        history.unshift(query);
        if (history.length > 5) history.pop();
        localStorage.setItem("searchHistory", JSON.stringify(history));
    } catch (e) {
        console.log("Erreur sauvegarde historique:", e);
    }
}

function highlightMatch(text, query) {
    if (!query) return text;
    try {
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi");
        return text.replace(regex, "<mark>$1</mark>");
    } catch (e) {
        return text;
    }
}

function hideResults(container) {
    if (!container) return;
    container.classList.remove('show');
    setTimeout(() => {
        if (!container.classList.contains('show')) {
            container.style.display = "none";
            container.innerHTML = '';
        }
    }, 200);
}

function showResults(container) {
    if (!container) return;
    container.style.display = "block";
    setTimeout(() => {
        container.classList.add('show');
    }, 10);
}

// ------------------------------------------------------
// FONCTION DE RECHERCHE GÉNÉRIQUE
// ------------------------------------------------------
async function performSearch(query, container) {
    try {
        if (query.length < 2) {
            if (query.length === 0) {
                hideResults(container);
            } else {
                container.innerHTML = `<div class="text-muted">
                    <i class="ec ec-info-circle"></i>Entrez au moins 2 caractères
                </div>`;
                showResults(container);
            }
            return;
        }

        saveSearch(query);
        container.innerHTML = `<div class="text-center">
            <div class="spinner-border" role="status">
                <span class="sr-only">Recherche...</span>
            </div>
            <span>Recherche en cours...</span>
        </div>`;
        showResults(container);

        const url = `${API}/products/search?q=${encodeURIComponent(query)}&limit=10`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Erreur recherche");
        const data = await res.json();
        const products = data.data || data.products || data.results || data;

        if (!products || products.length === 0) {
            container.innerHTML = `<div class="text-muted">
                <i class="ec ec-sad"></i>Aucun produit trouvé
            </div>`;
            return;
        }

        // Dans la fonction performSearch, remplace la partie map des produits
        renderSearchResults(products, query, container);

    } catch (err) {
        console.error("Erreur recherche:", err);
        container.innerHTML = `<div class="text-danger">
            <i class="ec ec-cross-circle"></i>Erreur lors de la recherche
        </div>`;
        showResults(container);
    }
}

// Fonction pour afficher les résultats avec les améliorations
function renderSearchResults(products, query, container) {
    if (!products || products.length === 0) {
        container.innerHTML = `<div class="text-muted">
            <i class="ec ec-sad"></i> Aucun produit trouvé
        </div>`;
        return;
    }
    
    let html = '';
    
    // En-tête avec compteur
    html += `<div style="padding:8px 15px; background:#f8f9fa; border-bottom:1px solid #eee; font-size:12px; color:#666;">
        <i class="ec ec-search"></i> ${products.length} produit(s) trouvé(s)
    </div>`;
    
    // Liste des produits
    products.forEach((p, index) => {
        const price = p.prices && p.prices[0] ? p.prices[0].price : 0;
        const imageUrl = p.images && p.images[0] ? p.images[0].image_url : 'uploads/products/demo-placeholders/demo-accessory.webp';
        const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : API + '/' + imageUrl;
        
        // ✅ Gestion du prix et du statut
        let priceDisplay = '';
        let promoBadge = '';
        let demandBadge = '';
        
        if (price <= 0) {
            // Cas "Sur demande"
            priceDisplay = `<div class="product-price">Prix sur demande</div>`;
            demandBadge = `<span class="search-demand-badge">Sur demande</span>`;
        } else if (p.promo && p.promo.discount_percent) {
            // Cas promo
            const discountedPrice = Math.round(price * (1 - p.promo.discount_percent / 100));
            promoBadge = `<span class="search-promo-badge">-${p.promo.discount_percent}%</span>`;
            priceDisplay = `
                <div>
                    <span class="old-price">${price.toLocaleString()} XOF</span>
                    <span class="new-price">${discountedPrice.toLocaleString()} XOF</span>
                </div>
            `;
        } else {
            // Cas normal
            priceDisplay = `<div class="product-price">${price.toLocaleString()} XOF</div>`;
        }
        
        html += `
            <a href="/single-product?id=${p.id}" class="search-result-item">
                <div class="search-image-wrapper">
                    <img src="${fullImageUrl}" 
                         alt="${p.name}" loading="lazy" decoding="async">
                    ${promoBadge}
                </div>
                <div style="flex-grow:1; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div class="product-name">${highlightMatch(p.name, query)}</div>
                        ${p.category?.name ? `<div class="product-category">${p.category.name}</div>` : ''}
                        ${priceDisplay}
                    </div>
                    ${demandBadge}
                </div>
            </a>
        `;
        
        // Séparateur entre les produits (sauf le dernier)
        if (index < products.length - 1) {
            html += `<div style="height:1px; background:#f0f0f0; margin:0 15px;"></div>`;
        }
    });
    
    // Pied de page
    html += `<div style="padding:10px 15px; background:#f8f9fa; border-top:1px solid #eee; text-align:center; font-size:11px; color:#999;">
        <i class="ec ec-check"></i> Fin des résultats
    </div>`;
    
    container.innerHTML = html;
}

// ------------------------------------------------------
// INITIALISATION DESKTOP
// ------------------------------------------------------
function initDesktopSearch() {
    const searchInput = document.getElementById("searchProduct");
    const resultsContainer = document.getElementById("search-results");
    const searchButton = document.getElementById("searchProduct1");

    if (!searchInput || !resultsContainer || !searchButton) {
        return false;
    }

    console.log("✅ Initialisation recherche desktop");
    
    async function desktopSearch() {
        await performSearch(searchInput.value.trim(), resultsContainer);
    }
    
    const debouncedDesktopSearch = debounce(desktopSearch, 300);

    searchInput.addEventListener("input", debouncedDesktopSearch);
    searchButton.addEventListener("click", (e) => {
        e.preventDefault();
        desktopSearch();
    });
    
    searchInput.addEventListener("focus", () => {
        if (searchInput.value.trim().length === 0) {
            showHistoryDesktop();
        }
    });

    function showHistoryDesktop() {
        try {
            let history = JSON.parse(localStorage.getItem("searchHistory")) || [];
            if (history.length > 0) {
                resultsContainer.innerHTML = history.map(h =>
                    `<div class="history-item" data-query="${h}">
                        <i class="ec ec-history"></i>${h}
                    </div>`
                ).join("");
                showResults(resultsContainer);
                
                document.querySelectorAll('#search-results .history-item').forEach(item => {
                    item.addEventListener('click', (e) => {
                        e.preventDefault();
                        searchInput.value = item.dataset.query;
                        desktopSearch();
                    });
                });
            }
        } catch (e) {
            console.log("Erreur affichage historique:", e);
        }
    }

    document.addEventListener("click", (e) => {
        if (!resultsContainer.contains(e.target) && 
            e.target !== searchInput && 
            !searchButton.contains(e.target)) {
            hideResults(resultsContainer);
        }
    });

    searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            hideResults(resultsContainer);
        }
    });

    resultsContainer.addEventListener("click", (e) => {
        e.stopPropagation();
    });

    return true;
}

// ------------------------------------------------------
// INITIALISATION MOBILE
// ------------------------------------------------------
function initMobileSearch() {
    const mobileSearchInput = document.getElementById("mobileSearchInput");
    const mobileResultsContainer = document.getElementById("mobile-search-results");
    const mobileSearchButton = document.getElementById("mobileSearchButton");

    if (!mobileSearchInput || !mobileResultsContainer || !mobileSearchButton) {
        return false;
    }

    console.log("✅ Initialisation recherche mobile");
    
    async function mobileSearch() {
        await performSearch(mobileSearchInput.value.trim(), mobileResultsContainer);
    }
    
    const debouncedMobileSearch = debounce(mobileSearch, 300);

    mobileSearchInput.addEventListener("input", debouncedMobileSearch);
    mobileSearchButton.addEventListener("click", (e) => {
        e.preventDefault();
        mobileSearch();
    });
    
    mobileSearchInput.addEventListener("focus", () => {
        if (mobileSearchInput.value.trim().length === 0) {
            showHistoryMobile();
        }
    });

    function showHistoryMobile() {
        try {
            let history = JSON.parse(localStorage.getItem("searchHistory")) || [];
            if (history.length > 0) {
                mobileResultsContainer.innerHTML = history.map(h =>
                    `<div class="history-item" data-query="${h}">
                        <i class="ec ec-history"></i>${h}
                    </div>`
                ).join("");
                showResults(mobileResultsContainer);
                
                document.querySelectorAll('#mobile-search-results .history-item').forEach(item => {
                    item.addEventListener('click', (e) => {
                        e.preventDefault();
                        mobileSearchInput.value = item.dataset.query;
                        mobileSearch();
                    });
                });
            }
        } catch (e) {
            console.log("Erreur affichage historique:", e);
        }
    }

    document.addEventListener("click", (e) => {
        if (!mobileResultsContainer.contains(e.target) && 
            e.target !== mobileSearchInput && 
            !mobileSearchButton.contains(e.target)) {
            hideResults(mobileResultsContainer);
        }
    });

    mobileSearchInput.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            hideResults(mobileResultsContainer);
        }
    });

    mobileResultsContainer.addEventListener("click", (e) => {
        e.stopPropagation();
    });

    return true;
}

// ------------------------------------------------------
// OBSERVATEUR POUR LA RECHERCHE DESKTOP (CHARGEMENT DYNAMIQUE)
// ------------------------------------------------------
function waitForDesktopSearch() {
    if (initDesktopSearch()) return;

    const observer = new MutationObserver(() => {
        if (document.getElementById('searchProduct')) {
            console.log("✅ Recherche desktop chargée dynamiquement");
            observer.disconnect();
            initDesktopSearch();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
        observer.disconnect();
        initDesktopSearch(); // Dernière tentative
    }, 5000);
}

// ------------------------------------------------------
// OBSERVATEUR POUR LE MENU MOBILE
// ------------------------------------------------------
function waitForMobileMenu() {
    if (initMobileSearch()) return;

    const observer = new MutationObserver(() => {
        if (document.getElementById('mobileSearchInput')) {
            console.log("📱 Menu mobile détecté");
            observer.disconnect();
            initMobileSearch();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
        observer.disconnect();
        initMobileSearch();
    }, 5000);
}

// ------------------------------------------------------
// ÉCOUTEURS D'ÉVÉNEMENTS PERSONNALISÉS
// ------------------------------------------------------
document.addEventListener('searchContainerLoaded', () => {
    console.log("🔍 Conteneur de recherche chargé");
    setTimeout(initDesktopSearch, 200);
});

document.addEventListener('mobileMenuLoaded', () => {
    console.log("📱 Menu mobile chargé");
    setTimeout(initMobileSearch, 200);
});

// ------------------------------------------------------
// NOUVEAUTÉS DU MÉGA-MENU (1 produit toutes les 2 secondes)
// ------------------------------------------------------
function initMegaMenuLatestProducts() {
    document.querySelectorAll('.nt-mega-menu-latest:not([data-latest-ready])').forEach(card => {
        card.dataset.latestReady = 'true';

        const menuTrigger = card.closest('.nt-has-menu');
        const name = card.querySelector('.nt-mega-menu-latest__name');
        const price = card.querySelector('.nt-mega-menu-latest__price');
        const image = card.querySelector('.nt-mega-menu-latest__image');
        const fallbackImage = '/static/img/500X400/laptop.png';
        let products = [];
        let currentIndex = -1;
        let timer = null;
        let requestInProgress = null;

        const shuffle = items => {
            const result = [...items];
            for (let i = result.length - 1; i > 0; i -= 1) {
                const j = Math.floor(Math.random() * (i + 1));
                [result[i], result[j]] = [result[j], result[i]];
            }
            return result;
        };

        const productImage = product => {
            const images = Array.isArray(product.images) ? product.images : [];
            const selected = images.find(item => item && item.is_main) || images[0];
            if (!selected || !selected.image_url) return fallbackImage;
            const path = selected.image_url;
            if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:')) return path;
            return `${window.API || ''}/${path.replace(/^\/+/, '')}`;
        };

        const showProduct = product => {
            if (!product) return;
            card.classList.add('is-changing');
            window.setTimeout(() => {
                const productName = product.name || 'Nouveau produit';
                const productSlug = product.slug ? `slug=${encodeURIComponent(product.slug)}` : `id=${encodeURIComponent(product.id)}`;
                const amount = product.prices && product.prices[0] ? Number(product.prices[0].price) : 0;

                card.href = `/single-product?${productSlug}`;
                card.setAttribute('aria-label', `Voir la fiche produit : ${productName}`);
                name.textContent = productName;
                price.textContent = amount > 0
                    ? `${amount.toLocaleString('fr-FR')} XOF`
                    : 'Prix sur demande';
                image.src = productImage(product);
                image.alt = productName;
                image.onerror = () => {
                    image.onerror = null;
                    image.src = fallbackImage;
                };
                card.classList.remove('is-changing');
            }, 180);
        };

        const nextProduct = () => {
            if (!products.length) return;
            currentIndex = (currentIndex + 1) % products.length;
            showProduct(products[currentIndex]);
        };

        const loadLatest = async () => {
            if (requestInProgress) return requestInProgress;
            requestInProgress = fetch(`${window.API || ''}/products/latest?limit=12`, { cache: 'no-store' })
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    return response.json();
                })
                .then(data => {
                    const latest = Array.isArray(data) ? data : (data.data || []);
                    products = shuffle(latest.filter(product => product && product.id));
                    currentIndex = -1;
                    nextProduct();
                })
                .catch(error => {
                    console.error('Erreur chargement des nouveautés du menu :', error);
                    price.textContent = 'Découvrir la boutique';
                })
                .finally(() => { requestInProgress = null; });
            return requestInProgress;
        };

        const start = async () => {
            window.clearInterval(timer);
            card.classList.remove('is-playing');
            await loadLatest();
            if (!menuTrigger.matches(':hover') && !menuTrigger.contains(document.activeElement)) return;
            if (products.length > 1) {
                card.classList.add('is-playing');
                timer = window.setInterval(nextProduct, 2000);
            }
        };

        const stop = () => {
            window.clearInterval(timer);
            timer = null;
            card.classList.remove('is-playing');
        };

        menuTrigger.addEventListener('mouseenter', start);
        menuTrigger.addEventListener('mouseleave', stop);
        menuTrigger.addEventListener('focusin', start);
        menuTrigger.addEventListener('focusout', () => window.setTimeout(() => {
            if (!menuTrigger.contains(document.activeElement)) stop();
        }, 0));

        // Précharge une première nouveauté sans attendre le premier survol.
        loadLatest();
    });
}

document.addEventListener('searchContainerLoaded', initMegaMenuLatestProducts);

// ------------------------------------------------------
// INITIALISATION PRINCIPALE
// ------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Initialisation recherche...");
    
    // Desktop (peut être déjà présent ou chargé dynamiquement)
    waitForDesktopSearch();
    
    // Mobile
    waitForMobileMenu();

    initMegaMenuLatestProducts();
});
