// ===============================================
// HELPER FORMAT PRIX (à mettre au début du fichier)
// ===============================================
function formatProductPrice(price, promo = null) {
    if (price <= 0) {
        return `<span class="font-size-18 text-success text-decoration-none d-block"><i class="fab fa-whatsapp mr-2 font-size-15"></i>Prix sur demande</span>`;
    }
    
    if (promo) {
        const finalPrice = Math.round(price * (1 - promo.discount_percent / 100));
        return `
            <div class="font-weight-bold  prodcut-price ">
                <del class="font-size-11 text-gray-9 d-block"><span class="js-price" data-fcfa="${price}"> ${price} XOF</span></del>
                <ins class="font-size-18 text-red text-decoration-none d-block"><span class="js-price" data-fcfa="${finalPrice}"> ${finalPrice} XOF</span></ins>
            </div>
        `;
    }
    
    return `<span class="font-size-18 text-red text-decoration-none d-block js-price" data-fcfa="${price}">${price} XOF</span>`;
}

// ===============================================
// HELPER FORMAT PRIX POUR DEALS
// ===============================================
function formatDealPrice(oldPrice, discountPercent, amountSaved, newPrice) {
    // Si le prix est 0 ou négatif
    if (oldPrice <= 0) {
        return `
            <div class="d-flex align-items-center justify-content-center mb-3">
                <span class="text-success"><i class="fas fa-phone-alt mr-1"></i>Prix sur demande</span>
            </div>
        `;
    }
    
    // Affichage normal du deal avec réduction
    return `
        <div class="d-flex align-items-center justify-content-center mb-3">
            <del class="font-size-18 mr-2 text-gray-2">
                <span class="js-price" data-fcfa="${oldPrice}">${oldPrice.toLocaleString()} XOF</span>
            </del>
            <ins class="font-size-xl-30 font-size-wd-25 text-red text-decoration-none">
                <span class="js-price" data-fcfa="${newPrice}">${newPrice.toLocaleString()} XOF</span>
            </ins>
        </div>
    `;
}

// ===============================================
// HELPER FORMAT PRIX POUR FOOTER (CORRIGÉ)
// ===============================================
function formatFooterPrice(price, promo = null) {
    // ✅ CAS 1 : Prix sur demande (0 ou négatif)
    if (price <= 0) {
        return `<span class="text-muted"><i class="fas fa-phone-alt mr-1"></i>Prix sur demande</span>`;
    }
    
    // ✅ CAS 2 : Prix avec promo (prix barré en haut, promo en bas)
    if (promo && promo.discount_percent) {
        const finalPrice = Math.round(price * (1 - promo.discount_percent / 100));
        return `
            <div class="text-gray-100">
                <del class="font-size-11 text-gray-9 d-block">${price.toLocaleString()} XOF</del>
                <ins class="font-size-15 text-red text-decoration-none d-block font-weight-bold">${finalPrice.toLocaleString()} XOF</ins>
            </div>
        `;
    }
    
    // ✅ CAS 3 : Prix normal
    return `<span class="js-price" data-fcfa="${price}">${price.toLocaleString()} XOF</span>`;
}
