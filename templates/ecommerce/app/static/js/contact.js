<script>
    document.addEventListener('DOMContentLoaded', function() {
        const contactForm = document.getElementById('contactForm');
        const submitBtn = document.getElementById('submitBtn');
        const formMessage = document.getElementById('formMessage');
        
        // API endpoint
        
        
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Récupérer les valeurs
            const name = document.getElementById('contactName').value.trim();
            const email = document.getElementById('contactEmail').value.trim();
            const phone = document.getElementById('contactPhone').value.trim();
            const subject = document.getElementById('contactSubject').value.trim();
            const message = document.getElementById('contactMessage').value.trim();
            
            // Validation simple
            if (!name || !email || !phone || !subject || !message) {
                showMessage('Veuillez remplir tous les champs obligatoires', 'danger');
                return;
            }
            
            // Désactiver le bouton pendant l'envoi
            submitBtn.disabled = true;
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Envoi en cours...';
            
            // ✅ CRÉER FORMDATA (pas JSON)
            const formData = new FormData();
            formData.append('name', name);
            formData.append('email', email);
            formData.append('phone', phone);
            formData.append('subject', subject);
            formData.append('message', message);
            
            try {
                const response = await fetch(`${API}/support/contact`, {
                    method: 'POST',
                    // ✅ PAS DE HEADERS 'Content-Type' (le navigateur le mettra automatiquement)
                    body: formData  // ✅ Envoi en FormData
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Succès
                    showMessage('✅ Votre message a bien été envoyé ! Notre équipe vous répondra dans les plus brefs délais.', 'success');
                    contactForm.reset(); // Vider le formulaire
                } else {
                    // Erreur
                    const errorMsg = data.detail || data.message || 'Erreur lors de l\'envoi';
                    showMessage('❌ ' + errorMsg, 'danger');
                }
            } catch (error) {
                console.error('Erreur:', error);
                showMessage('❌ Erreur de connexion au serveur. Veuillez réessayer plus tard.', 'danger');
            } finally {
                // Réactiver le bouton
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
        
        function showMessage(text, type) {
            formMessage.innerHTML = `
                <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'} mr-2"></i>
                    ${text}
                    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
            `;
            
            // Auto-scroll vers le message
            formMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            
            // Auto-fermeture après 5 secondes pour les succès
            if (type === 'success') {
                setTimeout(() => {
                    const alert = formMessage.querySelector('.alert');
                    if (alert) {
                        alert.classList.remove('show');
                        setTimeout(() => {
                            formMessage.innerHTML = '';
                        }, 150);
                    }
                }, 5000);
            }
        }
    });
</script>