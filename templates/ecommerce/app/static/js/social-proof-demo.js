(() => {
    "use strict";

    const DEMO_KEY = "nt_social_proof_demo";
    const DISMISSED_KEY = "nt_social_proof_demo_dismissed";
    const params = new URLSearchParams(window.location.search);
    const localHost = /^(localhost|127\.0\.0\.1|::1)$/i.test(window.location.hostname);
    const requested = params.get("nt_demo_social_proof");

    if (requested === "1") localStorage.setItem(DEMO_KEY, "1");
    if (requested === "0") localStorage.removeItem(DEMO_KEY);
    if (!(localHost || localStorage.getItem(DEMO_KEY) === "1") || sessionStorage.getItem(DISMISSED_KEY) === "1") return;

    const names = [
        "Kossi A.", "Ama K.", "Kodjo S.", "Adjoa D.", "Komlan T.", "Akossiwa M.", "Yao G.", "Eyram A.", "Koffi N.", "Abla Y.",
        "Sena K.", "Mawuli D.", "Nana A.", "Yawa E.", "Kokou B.", "Dédé M.", "Afi S.", "Essohan P.", "Komi A.", "Mariam B.",
        "Kpatcha G.", "Akouvi K.", "N'to A.", "Ablavi S.", "Atakora K.", "Merveille A.", "Fovi D.", "Essowè N.", "Tchalla K.", "Aïcha M.",
        "Koffi E.", "Dzigbodi A.", "Yendou T.", "Afiwa K.", "Kpakpo S.", "Mawouna D.", "Kossi G.", "Kafui A.", "Bawa M.", "Adélaïde K.",
        "Kodjo A.", "Yawa S.", "Komlan K.", "Akouété M.", "Sika A.", "Kokou D.", "Mélanie K.", "Fiavi E.", "Koffi A.", "Ablam P.",
        "Eloi K.", "Akoss Y.", "Sena D.", "Afi N.", "Yao K.", "Gifty A.", "Komi S.", "Abena M.", "Mawuli K.", "Aïda D.",
        "Kossi M.", "Yasmine A.", "Koffi S.", "Akouvi D.", "Kévin K.", "Eyram M.", "Kodjo N.", "Abla K.", "Komlan A.", "Nadia S.",
        "Tété K.", "Afiwa D.", "Fabrice A.", "Yawa M.", "Kokou K.", "Dédé A.", "Kafui S.", "Mawouna K.", "Yao D.", "Akossiwa A.",
        "Sena M.", "Kossi K.", "Mariam A.", "Koffi D.", "Ablavi K.", "Eyram S.", "Komi M.", "Adjoa A.", "Kodjo K.", "Afi D.",
        "Mawuli A.", "Yawa K.", "Kokou S.", "Akouvi M.", "Kossi D.", "Sena A.", "Koffi K.", "Eyram D.", "Komlan M.", "Abla S."
    ];
    const times = ["à l'instant", "il y a 2 minutes", "il y a 6 minutes", "il y a 12 minutes", "il y a 18 minutes"];
    let products = [];
    let index = 0;
    let timer = null;

    function imageUrl(path) {
        if (!path) return "/static/img/placeholder.jpg";
        if (/^https?:\/\//i.test(path)) return path;
        return `${window.API || ""}/${String(path).replace(/^\//, "")}`;
    }

    function escapeHtml(value) {
        return String(value || "").replace(/[&<>"']/g, character => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
        })[character]);
    }

    async function loadProducts() {
        const response = await fetch(`${window.API || ""}/products/latest?limit=12`, { credentials: "include" });
        if (!response.ok) throw new Error(`Produits indisponibles (${response.status})`);
        const result = await response.json();
        return Array.isArray(result) ? result.filter(product => product?.slug && product?.name) : [];
    }

    function closeCard(card, dismissed = false) {
        card.classList.add("is-hiding");
        window.setTimeout(() => card.remove(), 380);
        if (dismissed) {
            sessionStorage.setItem(DISMISSED_KEY, "1");
            window.clearTimeout(timer);
        }
    }

    function showNext() {
        if (!products.length || sessionStorage.getItem(DISMISSED_KEY) === "1") return;
        document.querySelector(".nt-social-proof-demo")?.remove();
        const product = products[index % products.length];
        const name = names[index % names.length];
        const time = times[index % times.length];
        index += 1;

        const card = document.createElement("aside");
        card.className = "nt-social-proof-demo";
        card.setAttribute("aria-label", "Suggestion de démonstration");
        const productLink = `/single-product?slug=${encodeURIComponent(product.slug)}`;
        const image = product.images?.find(entry => entry.is_main)?.image_url || product.images?.[0]?.image_url;
        card.innerHTML = `<a class="nt-social-proof-demo__image" href="${productLink}" aria-label="Voir ${escapeHtml(product.name)}"><img src="${escapeHtml(imageUrl(image))}" alt="" loading="lazy"></a><div class="nt-social-proof-demo__body"><span class="nt-social-proof-demo__eyebrow"><strong>Découverte</strong> · ${name} découvre</span><a class="nt-social-proof-demo__name" href="${productLink}"></a><span class="nt-social-proof-demo__meta">${time}</span></div><button class="nt-social-proof-demo__close" type="button" aria-label="Fermer">×</button>`;
        card.querySelector(".nt-social-proof-demo__name").textContent = product.name;
        card.querySelector(".nt-social-proof-demo__close").addEventListener("click", () => closeCard(card, true));
        document.body.appendChild(card);
        requestAnimationFrame(() => card.classList.add("is-visible"));
        timer = window.setTimeout(() => {
            closeCard(card);
            timer = window.setTimeout(showNext, 18000);
        }, 7000);
    }

    document.addEventListener("DOMContentLoaded", async () => {
        try {
            products = await loadProducts();
            if (products.length) timer = window.setTimeout(showNext, 5000);
        } catch (error) {
            console.info("[SocialProofDemo] Aucune suggestion affichée", error.message);
        }
    }, { once: true });
})();
