(() => {
    "use strict";

    const HOME_PATHS = new Set(["/", "/index", "/index.html"]);
    let railTimer = null;

    function imageUrl(value) {
        if (!value) return `${API}/placeholder.jpg`;
        const clean = String(value).replace(/\\/g, "/");
        if (/^https?:\/\//i.test(clean)) return clean;
        if (clean.startsWith("/static/")) return clean;
        return `${API}/${clean.replace(/^\//, "")}`;
    }

    function productPrice(product) {
        const promo = product.promo;
        const base = Number(product.prices?.[0]?.price || 0);
        if (!base) return "Prix sur demande";
        const discount = Number(promo?.discount_percent || 0);
        const price = discount > 0 ? base * (1 - discount / 100) : base;
        return `${Math.round(price).toLocaleString("fr-FR")} XOF`;
    }

    async function fetchJson(url) {
        const response = await fetch(url, { credentials: "include" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    }

    async function blogItems() {
        const posts = await fetchJson(`${API}/blog/latest?limit=6`);
        return posts.map((post) => ({
            href: `/blog/${encodeURIComponent(post.slug)}`,
            image: imageUrl(post.cover_image),
            badge: post.is_featured ? "À la une" : "Nouveau",
            category: post.category || "Le blog",
            name: post.title,
            price: ""
        }));
    }

    async function promoItems() {
        const sources = [
            ["/products/featured", "En vedette"],
            ["/products/on-sale", "En vente"],
            ["/products/top-rated", "Les mieux notés"]
        ];
        const results = await Promise.allSettled(sources.map(([path]) => fetchJson(`${API}${path}`)));
        const seen = new Set();
        const items = [];
        results.forEach((result, index) => {
            if (result.status !== "fulfilled" || !Array.isArray(result.value)) return;
            result.value.forEach((product) => {
                if (seen.has(product.id)) return;
                seen.add(product.id);
                items.push({
                    href: `/single-product?slug=${encodeURIComponent(product.slug)}`,
                    image: imageUrl(product.images?.find((entry) => entry.is_main)?.image_url || product.images?.[0]?.image_url),
                    badge: sources[index][1],
                    category: product.category?.name || "Notre sélection",
                    name: product.name,
                    price: productPrice(product)
                });
            });
        });
        return items.slice(0, 9);
    }

    function createText(tag, className, text) {
        const element = document.createElement(tag);
        element.className = className;
        element.textContent = text;
        return element;
    }

    function renderRail(items, isHome) {
        if (!items.length || document.querySelector(".nt-context-rail")) return;
        const rail = document.createElement("aside");
        rail.className = "nt-context-rail";
        rail.setAttribute("aria-label", isHome ? "Articles récents" : "Produits en promotion");
        rail.innerHTML = '<div class="nt-context-rail__accent"></div>';

        const head = document.createElement("div");
        head.className = "nt-context-rail__head";
        const heading = document.createElement("div");
        heading.append(
            createText("p", "nt-context-rail__eyebrow", isHome ? "À découvrir" : "Bon plan"),
            createText("p", "nt-context-rail__title", isHome ? "Le blog New Technologies" : "Offres sélectionnées")
        );
        const close = createText("button", "nt-context-rail__close", "×");
        close.type = "button";
        close.setAttribute("aria-label", "Fermer");
        head.append(heading, close);

        const viewport = document.createElement("div");
        viewport.className = "nt-context-rail__viewport";
        items.forEach((item, index) => {
            const link = document.createElement("a");
            link.className = `nt-context-rail__item${index === 0 ? " is-active" : ""}`;
            link.href = item.href;
            const media = document.createElement("div");
            media.className = "nt-context-rail__media";
            const image = document.createElement("img");
            image.src = item.image;
            image.alt = item.name;
            image.loading = "lazy";
            image.decoding = "async";
            image.onerror = () => { image.src = `${API}/placeholder.jpg`; };
            media.append(image, createText("span", "nt-context-rail__badge", item.badge));
            const body = document.createElement("div");
            body.className = "nt-context-rail__body";
            body.append(createText("span", "nt-context-rail__category", item.category), createText("p", "nt-context-rail__name", item.name));
            if (item.price) body.append(createText("div", "nt-context-rail__price js-price", item.price));
            link.append(media, body);
            viewport.append(link);
        });

        const footer = document.createElement("div");
        footer.className = "nt-context-rail__footer";
        const dots = document.createElement("div");
        dots.className = "nt-context-rail__dots";
        items.forEach((_, index) => {
            const dot = document.createElement("button");
            dot.type = "button";
            dot.className = `nt-context-rail__dot${index === 0 ? " is-active" : ""}`;
            dot.setAttribute("aria-label", `Afficher l'élément ${index + 1}`);
            dot.dataset.index = index;
            dots.append(dot);
        });
        const more = createText("a", "nt-context-rail__more", isHome ? "Voir le blog →" : "Voir les offres →");
        more.href = isHome ? "/blog" : "/shop";
        footer.append(dots, more);
        rail.append(head, viewport, footer);
        document.body.append(rail);

        let active = 0;
        const show = (next) => {
            const slides = rail.querySelectorAll(".nt-context-rail__item");
            const controls = rail.querySelectorAll(".nt-context-rail__dot");
            slides[active]?.classList.remove("is-active");
            controls[active]?.classList.remove("is-active");
            active = (next + items.length) % items.length;
            slides[active]?.classList.add("is-active");
            controls[active]?.classList.add("is-active");
        };
        const start = () => {
            clearInterval(railTimer);
            if (items.length > 1) railTimer = setInterval(() => show(active + 1), 4200);
        };
        dots.addEventListener("click", (event) => {
            const dot = event.target.closest(".nt-context-rail__dot");
            if (!dot) return;
            show(Number(dot.dataset.index));
            start();
        });
        rail.addEventListener("mouseenter", () => clearInterval(railTimer));
        rail.addEventListener("mouseleave", start);
        close.addEventListener("click", () => {
            clearInterval(railTimer);
            rail.classList.add("is-closing");
            setTimeout(() => rail.remove(), 320);
        });
        start();
    }

    async function initContextRail() {
        if (document.querySelector(".nt-context-rail")) return;
        const isHome = HOME_PATHS.has(window.location.pathname.replace(/\/$/, "") || "/");
        try {
            renderRail(isHome ? await blogItems() : await promoItems(), isHome);
        } catch (error) {
            console.warn("[ContextRail] Contenu indisponible", error);
        }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initContextRail, { once: true });
    else initContextRail();
    window.addEventListener("pageshow", (event) => { if (event.persisted) initContextRail(); });
})();
