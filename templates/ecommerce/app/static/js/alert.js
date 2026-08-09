// ===========================================
// ALERT BOX PERSONNALISÉE AVEC GIF
// ===========================================

(function() {
    // Créer et injecter les styles CSS
    const styles = `
        /* Style général de l'alert */
        .custom-alert {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 99999;
            font-family: 'Poppins', 'Open Sans', sans-serif;
            display: none;
        }
        
        /* Overlay semi-transparent avec flou */
        .custom-alert-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            animation: fadeIn 0.3s ease;
        }
        
        /* Conteneur principal */
        .custom-alert-container {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90%;
            max-width: 480px;
            animation: slideIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        
        /* Contenu de l'alert */
        .custom-alert-content {
            background: white;
            border-radius: 30px;
            padding: 40px 30px;
            text-align: center;
            position: relative;
            box-shadow: 0 30px 60px rgba(0, 0, 0, 0.4);
            overflow: hidden;
            border: 2px solid rgba(255, 255, 255, 0.1);
        }
        
        /* Effet de fond décoratif (shimmer) */
        .custom-alert-content::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: linear-gradient(
                45deg,
                transparent,
                rgba(255, 255, 255, 0.15),
                transparent
            );
            transform: rotate(45deg);
            animation: shimmer 4s infinite;
            pointer-events: none;
        }
        
        /* Bouton de fermeture */
        .custom-alert-close {
            position: absolute;
            top: 20px;
            right: 20px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #f5f5f5;
            border: none;
            color: #666;
            font-size: 20px;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }
        
        .custom-alert-close:hover {
            background: #e0e0e0;
            color: #333;
            transform: rotate(90deg) scale(1.1);
        }
        
        /* Zone du GIF */
        .custom-alert-gif {
            width: 160px;
            height: 160px;
            margin: 0 auto 20px;
            border-radius: 50%;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
            animation: float 4s ease-in-out infinite;
            border: 5px solid white;
        }
        
        .custom-alert-gif img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        /* Icône de fallback */
        .custom-alert-icon {
            width: 140px;
            height: 140px;
            margin: 0 auto 25px;
            border-radius: 50%;
            color: white;
            font-size: 70px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            animation: pulse 2s infinite;
            display: none;
        }
        
        /* Titre */
        .custom-alert-title {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 15px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            letter-spacing: -0.5px;
        }
        
        /* Message */
        .custom-alert-message {
            font-size: 16px;
            color: #555;
            margin-bottom: 30px;
            line-height: 1.7;
            padding: 0 15px;
            font-weight: 400;
        }
        
        /* Bouton d'action */
        .custom-alert-button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            padding: 14px 40px;
            border-radius: 60px;
            color: white;
            font-size: 17px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 15px 30px rgba(102, 126, 234, 0.4);
            border: 2px solid rgba(255, 255, 255, 0.2);
        }
        
        .custom-alert-button:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 40px rgba(102, 126, 234, 0.5);
        }
        
        .custom-alert-button:active {
            transform: translateY(0);
        }
        
        /* Types d'alert - SUCCESS (vert) */
        .custom-alert.success .custom-alert-icon {
            background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
        }
        
        .custom-alert.success .custom-alert-title {
            background: linear-gradient(135deg, #00b09b 0%, #96c93d 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .custom-alert.success .custom-alert-button {
            background: linear-gradient(135deg, #00b09b 0%, #96c93d 100%);
        }
        
        /* Types d'alert - ERROR (rouge) */
        .custom-alert.error .custom-alert-icon {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }
        
        .custom-alert.error .custom-alert-title {
            background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .custom-alert.error .custom-alert-button {
            background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
        }
        
        /* Types d'alert - WARNING (orange) */
        .custom-alert.warning .custom-alert-icon {
            background: linear-gradient(135deg, #f6d365 0%, #fda085 100%);
        }
        
        .custom-alert.warning .custom-alert-title {
            background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .custom-alert.warning .custom-alert-button {
            background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
        }
        
        /* Types d'alert - INFO (bleu) */
        .custom-alert.info .custom-alert-icon {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .custom-alert.info .custom-alert-title {
            background: linear-gradient(135deg, #4e73df 0%, #36b9cc 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .custom-alert.info .custom-alert-button {
            background: linear-gradient(135deg, #4e73df 0%, #36b9cc 100%);
        }
        
        /* Animations */
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translate(-50%, -70%);
            }
            to {
                opacity: 1;
                transform: translate(-50%, -50%);
            }
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.08); }
            100% { transform: scale(1); }
        }
        
        @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-12px); }
            100% { transform: translateY(0px); }
        }
        
        @keyframes shimmer {
            0% { transform: translateX(-100%) rotate(45deg); }
            100% { transform: translateX(100%) rotate(45deg); }
        }
        
        @keyframes rotateIn {
            from {
                opacity: 0;
                transform: rotate(-180deg) scale(0.3);
            }
            to {
                opacity: 1;
                transform: rotate(0) scale(1);
            }
        }
        
        /* Responsive */
        @media (max-width: 576px) {
            .custom-alert-content {
                padding: 30px 20px;
            }
            
            .custom-alert-gif {
                width: 130px;
                height: 130px;
            }
            
            .custom-alert-icon {
                width: 110px;
                height: 110px;
                font-size: 55px;
            }
            
            .custom-alert-title {
                font-size: 26px;
            }
            
            .custom-alert-message {
                font-size: 14px;
                padding: 0 5px;
            }
            
            .custom-alert-button {
                padding: 12px 30px;
                font-size: 15px;
            }
        }
    `;

    // Injecter les styles dans le head
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    // Fonction pour créer l'alert box
    function createAlertBox() {
        // Vérifier si l'alert existe déjà
        if (document.getElementById('customAlert')) return;
        
        const alertHTML = `
            <div id="customAlert" class="custom-alert" style="display: none;">
                <div class="custom-alert-overlay"></div>
                <div class="custom-alert-container">
                    <div class="custom-alert-content">
                        <button class="custom-alert-close" onclick="hideCustomAlert()">
                            <i class="fas fa-times"></i>
                        </button>
                        
                        <div class="custom-alert-gif">
                            <img src="/static/img/alert-placeholder.gif" alt="Animation" id="alertGif">
                        </div>
                        
                        <div class="custom-alert-icon" id="alertIcon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        
                        <h3 class="custom-alert-title" id="alertTitle">Succès !</h3>
                        
                        <p class="custom-alert-message" id="alertMessage">Votre action a été effectuée avec succès.</p>
                        
                        <button class="custom-alert-button" onclick="hideCustomAlert()" id="alertButton">
                            <span>Fermer</span>
                            <i class="fas fa-arrow-right ml-2"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Ajouter au body
        document.body.insertAdjacentHTML('beforeend', alertHTML);
    }

    // Fonction pour afficher l'alert (globale)
    window.showCustomAlert = function(options = {}) {
        // S'assurer que l'alert existe
        createAlertBox();
        
        const {
            type = 'success',
            title = 'Succès !',
            message = 'Opération réussie',
            gifUrl = '/static/img/alert-placeholder.gif',
            buttonText = 'Fermer',
            autoClose = false,
            duration = 3000,
            onClose = null
        } = options;
        
        const alertBox = document.getElementById('customAlert');
        const alertGif = document.getElementById('alertGif');
        const alertIcon = document.getElementById('alertIcon');
        const alertTitle = document.getElementById('alertTitle');
        const alertMessage = document.getElementById('alertMessage');
        const alertButton = document.getElementById('alertButton');
        
        if (!alertBox) return;
        
        // Mettre à jour le type
        alertBox.className = 'custom-alert ' + type;
        
        // Gestion du GIF
        alertGif.onload = function() {
            alertGif.style.display = 'block';
            alertIcon.style.display = 'none';
        };
        
        alertGif.onerror = function() {
            alertGif.style.display = 'none';
            alertIcon.style.display = 'flex';
            
            // Changer l'icône selon le type
            const iconElement = alertIcon.querySelector('i');
            if (iconElement) {
                if (type === 'success') iconElement.className = 'fas fa-check-circle';
                else if (type === 'error') iconElement.className = 'fas fa-times-circle';
                else if (type === 'warning') iconElement.className = 'fas fa-exclamation-triangle';
                else if (type === 'info') iconElement.className = 'fas fa-info-circle';
            }
        };
        
        // Mettre à jour le contenu
        alertGif.src = gifUrl;
        alertTitle.textContent = title;
        alertMessage.textContent = message;
        alertButton.innerHTML = `<span>${buttonText}</span> <i class="fas fa-arrow-right ml-2"></i>`;
        
        // Afficher l'alert
        alertBox.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Empêcher le scroll
        
        // Animation d'entrée supplémentaire pour l'icône
        if (alertIcon.style.display === 'flex') {
            alertIcon.style.animation = 'rotateIn 0.5s ease';
        }
        
        // Auto-fermeture si demandé
        if (autoClose) {
            setTimeout(() => {
                window.hideCustomAlert();
                if (onClose) onClose();
            }, duration);
        }
    };

    // Fonction pour cacher l'alert (globale)
    window.hideCustomAlert = function() {
        const alertBox = document.getElementById('customAlert');
        if (alertBox) {
            alertBox.style.display = 'none';
            document.body.style.overflow = ''; // Restaurer le scroll
        }
    };

    // Fermer avec la touche Echap
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            window.hideCustomAlert();
        }
    });

    // Créer l'alert au chargement du DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createAlertBox);
    } else {
        createAlertBox();
    }

})();