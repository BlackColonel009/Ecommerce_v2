// Variables globales
let galleryData = [];
let currentIndex = 0;
let isLoading = false;
let touchStartX = 0;
let touchEndX = 0;

// Éléments du DOM
const mainImage = document.getElementById('mainImage');
const mainContainer = document.getElementById('mainImageContainer');
const overlayTitle = document.getElementById('overlayTitle');
const overlayDesc = document.getElementById('overlayDesc');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const thumbnailContainer = document.getElementById('thumbnailContainer');
const categoryBadge = document.querySelector('.category-badge');
const imageBadge = document.querySelector('.image-badge');
const imageResolution = document.getElementById('imageResolution');
const imageDate = document.getElementById('imageDate');
const imageLikes = document.getElementById('imageLikes');

// Fonction pour charger les données depuis l'API
async function loadBannerData() {
    try {
        thumbnailContainer.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin"></i> Chargement des produits...</div>';
        
        const response = await fetch(`${API}/marketing/banner`);
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();

        function getFullImageUrl(imagePath) {
            if (!imagePath) return null;
            if (imagePath.startsWith('http')) return imagePath;
            return `${API}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
        }
        
        if (Array.isArray(data)) {
            galleryData = data.map((item, index) => ({
                id: item.id || index + 1,
                image: getFullImageUrl(item.image_url),
                thumbnail: getFullImageUrl(item.image_mobile_url || item.image_url),
                title: item.title || 'Produit sans titre',
                description: item.description || `Offre valable du ${new Date(item.start_date).toLocaleDateString('fr-FR')} au ${new Date(item.end_date).toLocaleDateString('fr-FR')}`,
                category: item.position || 'Bannière',
                resolution: 'Haute Définition',
                date: new Date(item.start_date).getFullYear().toString() || '2026',
                likes: Math.floor(Math.random() * 500) + 50,
                badge: item.is_active ? 'Actif' : 'Bientôt',
                link: item.link || '#'
            }));
        } else {
            const mainItem = {
                id: data.id || 1,
                image: data.image_url || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
                thumbnail: data.image_mobile_url || data.image_url || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
                title: data.title || 'Produit à la une',
                description: `Offre spéciale jusqu'au ${new Date(data.end_date).toLocaleDateString('fr-FR')}`,
                category: data.position || 'Nouveauté',
                resolution: '4K Ultra HD',
                date: new Date(data.start_date).getFullYear().toString() || '2026',
                likes: Math.floor(Math.random() * 500) + 100,
                badge: data.is_active ? 'Nouveauté' : 'Bientôt',
                link: data.link || '#'
            };
            
            const additionalProducts = [
                {
                    id: 2,
                    image: 'https://images.unsplash.com/photo-1592434134753-a70baf7979d5?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
                    thumbnail: 'https://images.unsplash.com/photo-1592434134753-a70baf7979d5?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
                    title: 'iPhone 15 Pro Max',
                    description: 'Titane • 256 Go • Caméra 48MP',
                    category: 'Smartphone',
                    resolution: 'Full HD+',
                    date: '2026',
                    likes: 567,
                    badge: 'Best Seller',
                    link: '/category/smartphones'
                },
                {
                    id: 3,
                    image: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
                    thumbnail: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
                    title: 'iPad Pro 12.9"',
                    description: 'Puce M2 • 5G • Apple Pencil',
                    category: 'Tablette',
                    resolution: 'Liquid Retina',
                    date: '2026',
                    likes: 389,
                    badge: 'Nouveau',
                    link: '/category/tablets'
                },
                {
                    id: 4,
                    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
                    thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
                    title: 'AirPods Max',
                    description: 'Audio spatial • Réduction bruit active',
                    category: 'Audio',
                    resolution: 'Hi-Res Audio',
                    date: '2026',
                    likes: 445,
                    badge: 'Promo -10%',
                    link: '/category/audio'
                },
                {
                    id: 5,
                    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
                    thumbnail: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
                    title: 'Apple Watch Ultra',
                    description: 'GPS + Cellular • Étanche 100m',
                    category: 'Montre',
                    resolution: 'Retina OLED',
                    date: '2026',
                    likes: 278,
                    badge: 'Sport',
                    link: '/category/watches'
                }
            ];
            
            galleryData = [mainItem, ...additionalProducts];
        }
        
        createThumbnails();
        
        if (galleryData.length > 0) {
            updateDisplay(0);
        } else {
            thumbnailContainer.innerHTML = '<div class="text-center py-4">Aucune donnée disponible</div>';
        }
        
    } catch (error) {
        console.error('Erreur:', error);
        thumbnailContainer.innerHTML = `<div class="text-center text-danger py-4">
            <i class="fas fa-exclamation-circle"></i> Erreur de chargement: ${error.message}
        </div>`;
        useFallbackData();
    }
}

// Fonction de fallback
function useFallbackData() {
    galleryData = [
        {
            id: 1,
            image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
            thumbnail: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
            title: 'MacBook Pro 16"',
            description: 'Puce M3 Max • 48 Go RAM • 1 To SSD',
            category: 'Ordinateur',
            resolution: '4K Ultra HD',
            date: '2024',
            likes: 234,
            badge: 'Nouveauté',
            link: '#'
        },
        {
            id: 2,
            image: 'https://images.unsplash.com/photo-1592434134753-a70baf7979d5?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
            thumbnail: 'https://images.unsplash.com/photo-1592434134753-a70baf7979d5?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
            title: 'iPhone 15 Pro Max',
            description: 'Titane • 256 Go • Caméra 48MP',
            category: 'Smartphone',
            resolution: 'Full HD+',
            date: '2024',
            likes: 567,
            badge: 'Best Seller',
            link: '#'
        },
        {
            id: 3,
            image: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
            thumbnail: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
            title: 'iPad Pro 12.9"',
            description: 'Puce M2 • 5G • Apple Pencil',
            category: 'Tablette',
            resolution: 'Liquid Retina',
            date: '2024',
            likes: 189,
            badge: 'Promo -10%',
            link: '#'
        },
        {
            id: 4,
            image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
            thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
            title: 'AirPods Max',
            description: 'Audio spatial • Réduction bruit active',
            category: 'Audio',
            resolution: 'Hi-Res Audio',
            date: '2024',
            likes: 345,
            badge: 'Nouveau',
            link: '#'
        },
        {
            id: 5,
            image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
            thumbnail: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
            title: 'Apple Watch Ultra',
            description: 'GPS + Cellular • Étanche 100m',
            category: 'Montre',
            resolution: 'Retina OLED',
            date: '2024',
            likes: 178,
            badge: 'Sport',
            link: '#'
        }
    ];
    
    createThumbnails();
    updateDisplay(0);
}

// 🎯 Fonction de mise à jour avec animation de scroll
function updateDisplay(index) {
    const item = galleryData[index];
    const direction = index > currentIndex ? 'next' : 'prev';
    
    isLoading = true;
    mainContainer.classList.add('loading');
    
    // Animation de sortie
    mainImage.style.transform = `translateX(${direction === 'next' ? '-100%' : '100%'})`;
    mainImage.style.opacity = '0';
    
    setTimeout(() => {
        mainImage.src = item.image;
        overlayTitle.textContent = item.title;
        overlayDesc.textContent = item.description;
        
        categoryBadge.innerHTML = `<i class="fas fa-tag"></i> <a href="${item.link}" class="text-white category-link">${item.category}</a>`;
        imageBadge.innerHTML = `<i class="fas fa-star"></i> ${item.badge}`;
        imageResolution.textContent = item.resolution || 'HD';
        imageDate.textContent = item.date;
        imageLikes.textContent = item.likes;
        
        // Animation d'entrée
        mainImage.style.transform = `translateX(${direction === 'next' ? '100%' : '-100%'})`;
        mainImage.style.opacity = '0';
        
        setTimeout(() => {
            mainImage.style.transform = 'translateX(0)';
            mainImage.style.opacity = '1';
        }, 50);
        
        // Mettre à jour les miniatures
        document.querySelectorAll('.thumbnail-item').forEach((thumb, i) => {
            if (i === index) {
                thumb.classList.add('active');
                // Scroll la miniature dans la vue si nécessaire
                thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            } else {
                thumb.classList.remove('active');
            }
        });
        
        currentIndex = index;
        isLoading = false;
        mainContainer.classList.remove('loading');
        
        prevBtn.disabled = index === 0;
        nextBtn.disabled = index === galleryData.length - 1;
    }, 300);
}

// Fonction pour créer les miniatures
function createThumbnails() {
    thumbnailContainer.innerHTML = '';
    
    galleryData.forEach((item, index) => {
        const thumbItem = document.createElement('div');
        thumbItem.className = `thumbnail-item ${index === 0 ? 'active' : ''}`;
        thumbItem.innerHTML = `
            <img src="${item.thumbnail}" alt="${item.title}" loading="lazy">
            <div class="thumbnail-overlay">
                <i class="fas fa-search-plus"></i>
            </div>
        `;
        
        thumbItem.addEventListener('click', () => {
            if (!isLoading && index !== currentIndex) {
                updateDisplay(index);
            }
        });
        
        thumbnailContainer.appendChild(thumbItem);
    });
}

// Fonctions de navigation
function nextImage() {
    if (currentIndex < galleryData.length - 1 && !isLoading) {
        updateDisplay(currentIndex + 1);
    }
}

function prevImage() {
    if (currentIndex > 0 && !isLoading) {
        updateDisplay(currentIndex - 1);
    }
}

// 🖱️ Support tactile pour mobile
function handleTouchStart(e) {
    touchStartX = e.touches[0].clientX;
}

function handleTouchEnd(e) {
    touchEndX = e.changedTouches[0].clientX;
    handleSwipe();
}

function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;
    
    if (Math.abs(diff) > swipeThreshold && !isLoading) {
        if (diff > 0) {
            // Swipe gauche → image suivante
            nextImage();
        } else {
            // Swipe droite → image précédente
            prevImage();
        }
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    loadBannerData();
    
    // Événements
    prevBtn.addEventListener('click', prevImage);
    nextBtn.addEventListener('click', nextImage);
    
    // Navigation clavier
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            prevImage();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            nextImage();
        }
    });
    
    // Support tactile
    mainContainer.addEventListener('touchstart', handleTouchStart);
    mainContainer.addEventListener('touchend', handleTouchEnd);
});

// Clic sur l'image principale
mainContainer.addEventListener('click', () => {
    if (!isLoading) {
        const currentItem = galleryData[currentIndex];
        if (currentItem && currentItem.link && currentItem.link !== '#') {
            window.location.href = currentItem.link;
        }
    }
});