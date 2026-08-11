(function () {
    const apiBase = () => window.API_BASE || window.API || "";
    const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
    const assetUrl = (path) => path ? `${apiBase().replace(/\/$/, "")}/${String(path).replace(/^\/+/, "")}` : "/placeholder.jpg";
    const price = (value) => new Intl.NumberFormat("fr-FR").format(Number(value || 0)) + " XOF";

    function productCard(item, label) {
        const product = item.product || {};
        const promo = item.promo || {};
        const image = (product.images || []).find(imageItem => imageItem.is_main) || (product.images || [])[0] || {};
        const original = Number((product.prices || [])[0]?.price || 0);
        const discounted = original * (100 - Number(promo.discount_percent || 0)) / 100;
        const slug = encodeURIComponent(product.slug || "");
        return `<article class="nt-event-card"><span class="nt-event-card__flag">${escapeHtml(label)} · -${escapeHtml(promo.discount_percent)}%</span><a class="nt-event-card__image" href="/single-product?slug=${slug}"><img src="${assetUrl(image.image_url)}" alt="${escapeHtml(product.name)}" loading="lazy"></a><div class="nt-event-card__body"><span class="nt-event-card__category">${escapeHtml(product.category?.name || "New Technologies")}</span><h3><a href="/single-product?slug=${slug}">${escapeHtml(product.name)}</a></h3><div class="nt-event-card__price">${price(discounted)} <span class="nt-event-card__old">${price(original)}</span></div></div><a class="nt-event-card__action" href="/single-product?slug=${slug}">Voir le produit <i class="fas fa-arrow-right"></i></a></article>`;
    }

    async function activePromos() {
        const response = await fetch(`${apiBase().replace(/\/$/, "")}/marketing/promo/active`);
        if (!response.ok) throw new Error("Les offres ne sont pas disponibles.");
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    }

    function setEventBadge(promos) {
        const badge = document.getElementById("eventMenuBadge");
        if (!badge) return;
        const latest = promos.filter(item => item.promo?.tag === "gift").sort((a, b) => new Date(b.promo.start_date) - new Date(a.promo.start_date))[0];
        if (!latest) return;
        const age = Math.floor((Date.now() - new Date(latest.promo.start_date).getTime()) / 86400000);
        if (age > 20) return;
        badge.hidden = false;
        badge.className = `nt-event-menu-badge is-${age < 7 ? "fresh" : age < 14 ? "warm" : "soft"}`;
    }

    async function initPage() {
        const giftContainer = document.getElementById("giftProducts");
        if (!giftContainer) return;
        try {
            const promos = await activePromos();
            const gifts = promos.filter(item => item.promo?.tag === "gift");
            const blackFriday = promos.filter(item => item.promo?.tag === "black_friday");
            giftContainer.innerHTML = gifts.map(item => productCard(item, "GIFT")).join("");
            document.getElementById("giftEmpty").hidden = gifts.length > 0;
            const count = document.getElementById("giftCount");
            if (count && gifts.length) { count.hidden = false; count.textContent = `${gifts.length} idée${gifts.length > 1 ? "s" : ""}`; }
            if (blackFriday.length) {
                document.getElementById("blackFridaySection").hidden = false;
                document.getElementById("blackFridayProducts").innerHTML = blackFriday.map(item => productCard(item, "BLACK FRIDAY")).join("");
            }
            setEventBadge(promos);
        } catch (error) {
            document.getElementById("giftEmpty").hidden = false;
            console.error("[events]", error);
        }
    }

    function startReveal() {
        const reveal = document.getElementById("eventReveal");
        if (reveal && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) reveal.classList.add("is-playing");
    }

    document.addEventListener("DOMContentLoaded", () => { startReveal(); initPage(); });
    document.addEventListener("navContainerLoaded", () => activePromos().then(setEventBadge).catch(() => {}));
    window.initEventMenuBadge = () => activePromos().then(setEventBadge).catch(() => {});
})();
