// product-utils.js
// product-utils.js - CORRIGÉ
const ProductUtils = {
    // Récupère l'ID du produit courant
    getCurrentProductId: function() {
        // Essayer d'abord le localStorage
        const storedId = localStorage.getItem('current_product_id');
        if (storedId) return parseInt(storedId);
        
        // Ensuite l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const urlId = urlParams.get('id');
        if (urlId) return parseInt(urlId);
        
        // Chercher dans les clés promo
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('promo_percent_')) {
                return parseInt(key.replace('promo_percent_', ''));
            }
        }
        
        return null;
    },
    
    // Définit l'ID du produit courant
    setCurrentProductId: function(productId) {
        localStorage.setItem('current_product_id', productId);
    },
    
    // Récupère le prix promo si existe
    getPromoPrice: function(productId) {
        const id = productId || this.getCurrentProductId();
        if (!id) return null;
        
        const promoPrice = localStorage.getItem(`promo_price_${id}`);
        return promoPrice ? parseFloat(promoPrice) : null;
    },
    
    // Récupère le pourcentage promo si existe
    getPromoPercent: function(productId) {
        const id = productId || this.getCurrentProductId();
        if (!id) return null;
        
        return localStorage.getItem(`promo_percent_${id}`);
    },  // ← AJOUTE LA VIRGULE ICI !
    
    // ✅ Met à jour l'ID du produit et nettoie l'ancien
    updateCurrentProduct: function(newProductId, newProductSlug = null) {
        const oldId = localStorage.getItem('current_product_id');
        
        // Si c'est un nouveau produit, nettoyer les anciennes données promo
        if (oldId && oldId != newProductId) {
            localStorage.removeItem(`promo_price_${oldId}`);
            localStorage.removeItem(`promo_percent_${oldId}`);
            console.log(`🧹 Ancien produit #${oldId} nettoyé`);
        }
        
        // Définir le nouveau
        localStorage.setItem('current_product_id', newProductId);
        if (newProductSlug) {
            localStorage.setItem('current_product_slug', newProductSlug);
        }
        
        console.log(`✅ Nouveau produit #${newProductId} enregistré`);
    }
};

// Utilisation :
// const productId = ProductUtils.getCurrentProductId();
// const promoPrice = ProductUtils.getPromoPrice();