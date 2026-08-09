function renderBreadcrumb({ category, product, categoryId, categorySlug }) {
    const breadcrumbContainer = document.querySelector("nav[aria-label='breadcrumb'] ol.breadcrumb");
    if (!breadcrumbContainer) return;

    let html = `
        <li class="breadcrumb-item"><a href="/">Accueil</a></li>
        <li class="breadcrumb-item"><a href="/category">Toutes catégories</a></li>
    `;

    if (category) {
        // ✅ Utiliser le slug de la catégorie si disponible
        const catSlug = category.slug || category.id;
        html += `
            <li class="breadcrumb-item">
                <a href="/category-slug?slug=${catSlug}">${category.name}</a>
            </li>
        `;
    } else if (categoryId) {
        html += `
            <li class="breadcrumb-item">
                <a href="/category-product?id=${categoryId}">Catégorie #${categoryId}</a>
            </li>
        `;
    } else if (categorySlug) {
        html += `
            <li class="breadcrumb-item">
                <a href="/category-slug?slug=${categorySlug}">${categorySlug}</a>
            </li>
        `;
    }

    if (product) {
        // ✅ Utiliser le slug du produit si disponible
        const productSlug = product.slug || product.id;
        html += `
            <li class="breadcrumb-item active" aria-current="page">
                <a href="/single-product?slug=${productSlug}">${product.name}</a>
            </li>
        `;
    }

    breadcrumbContainer.innerHTML = html;
}