// Script pour gérer automatiquement toutes les images de profil
document.addEventListener('DOMContentLoaded', function() {
    const profileImages = document.querySelectorAll('.profile-image');
    
    profileImages.forEach((img, index) => {
        img.addEventListener('error', function() {
            const container = this.parentElement;
            const fallback = container.querySelector('.profile-fallback');
            
            if (fallback) {
                this.style.display = 'none';
                fallback.style.display = 'flex';
            }
        });
    });
});