(function () {
    "use strict";

    const body = document.body;
    if (!body || !body.classList.contains("home-modern")) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const revealSelectors = [
        ".nt-section-heading > div",
        ".nt-trust article",
        ".nt-category-card",
        "#featured-banner > div",
        ".nt-product-tabs",
        ".nt-product-tabs .product-item",
        ".nt-deals #deals-carousel",
        ".nt-product-carousel .js-slide",
        ".nt-services__copy",
        ".nt-services__cards article",
        ".nt-brands > .container > .nt-kicker",
        ".nt-brands > .container > h2",
        ".nt-brands .slick-slide:not(.slick-cloned)"
    ];
    const revealSelector = revealSelectors.join(",");
    const imageSelector = "img:not(.slick-loading)";
    let observer = null;

    function reveal(element) {
        element.classList.add("is-visible");
        observer?.unobserve(element);
    }

    function staggerDelay(element) {
        const parent = element.parentElement;
        if (!parent) return 0;

        const peers = Array.from(parent.children).filter(peer => peer.matches?.(revealSelector));
        const index = Math.max(0, peers.indexOf(element));
        return Math.min(index, 3) * 80;
    }

    function register(element) {
        if (!(element instanceof HTMLElement) || element.dataset.ntRevealRegistered === "true") return;

        element.dataset.ntRevealRegistered = "true";
        element.dataset.ntReveal = "fade-up";
        element.style.setProperty("--nt-reveal-delay", `${staggerDelay(element)}ms`);
        element.querySelectorAll(imageSelector).forEach(image => image.classList.add("nt-reveal-media"));

        if (reduceMotion.matches || !observer) {
            reveal(element);
            return;
        }

        observer.observe(element);
    }

    function registerWithin(root) {
        if (!(root instanceof Element || root instanceof Document)) return;
        if (root instanceof Element && root.matches(revealSelector)) register(root);
        root.querySelectorAll(revealSelector).forEach(register);
    }

    function showEverything() {
        document.querySelectorAll("[data-nt-reveal]").forEach(reveal);
    }

    if (reduceMotion.matches || !("IntersectionObserver" in window)) {
        body.classList.add("nt-reveal-ready");
        registerWithin(document);
        showEverything();
        return;
    }

    observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) reveal(entry.target);
        });
    }, {
        root: null,
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.12
    });

    body.classList.add("nt-reveal-ready");
    registerWithin(document);

    const dynamicContentObserver = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node instanceof Element) registerWithin(node);
            });
        });
    });
    dynamicContentObserver.observe(document.querySelector("main") || body, { childList: true, subtree: true });

    reduceMotion.addEventListener?.("change", event => {
        if (event.matches) showEverything();
    });
})();
