// Liste de toutes tes images de marques
const brandImages = [
    { src: "/static/img/200X60/dell.png", alt: "Dell" },
    { src: "/static/img/200X60/lenovo.png", alt: "Lenovo" },
    { src: "/static/img/200X60/hp.png", alt: "HP" },
    { src: "/static/img/200X60/hikvision.png", alt: "Hikvision" },
    { src: "/static/img/200X60/mi.png", alt: "Xiaomi" },
    { src: "/static/img/200X60/ncts.png", alt: "NCTS" },
    { src: "/static/img/200X60/kaspersky.png", alt: "Kaspersky" },
    { src: "/static/img/200X60/maxima.png", alt: "Maxima" },
    { src: "/static/img/200X60/canon.png", alt: "Canon" },
    { src: "/static/img/200X60/lg.png", alt: "LG" },
    { src: "/static/img/200X60/samsung.png", alt: "Samsung" }
];

// Fonction pour mélanger un tableau (algorithme de Fisher-Yates)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Fonction pour charger les marques aléatoirement
function loadRandomBrands() {
    const container = document.querySelector('.marque-container');
    if (!container) return;

    // Mélanger les images
    const shuffledBrands = shuffleArray([...brandImages]);
    
    // Générer le HTML
    let html = '';
    shuffledBrands.forEach(brand => {
        html += `
            <div class="js-slide">
                <a href="/shop" class="link-hover__brand">
                    <img class="img-fluid m-auto max-height-50" 
                         src="${brand.src}" 
                         alt="${brand.alt}"
                         loading="lazy">
                </a>
            </div>
        `;
    });

    // Injecter dans le conteneur
    container.innerHTML = html;

    // Réinitialiser Slick carousel (si nécessaire)
    if (typeof $.HSCore !== 'undefined' && $.HSCore.components.HSSlickCarousel) {
        const $container = $('.marque-container');
        if ($container.hasClass('slick-initialized')) {
            $container.slick('unslick');
        }
        $.HSCore.components.HSSlickCarousel.init('.marque-container');
    }

    console.log("✅ Marques chargées aléatoirement:", shuffledBrands.length);
}

// Charger au chargement de la page
document.addEventListener('DOMContentLoaded', loadRandomBrands);

// Si tes marques sont dans un composant chargé dynamiquement
document.addEventListener('brandsLoaded', loadRandomBrands);
