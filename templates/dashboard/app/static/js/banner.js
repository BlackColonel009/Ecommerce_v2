const token = localStorage.getItem("access_token"); // token stocké dans le localStorage



// ----- POST Bannières -----
const bannerForm = document.getElementById('bannerForm');
bannerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(bannerForm);

    try {
        const response = await fetch(`${API_BASE}/marketing/banner`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) throw new Error('Erreur lors de la création de la bannière');

        const data = await response.json();
        alert('Bannière ajoutée avec succès !');
        bannerForm.reset();
        fetchBanners(); // refresh la liste
    } catch (error) {
        console.error(error);
        alert('Erreur lors de l\'ajout de la bannière');
    }
});

// ----- GET Bannières -----
async function fetchBanners() {
    try {
        const response = await fetch(`${API_BASE}/marketing/banner`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Erreur lors de la récupération des bannières');

        const banners = await response.json();
        renderBanners(banners);
    } catch (error) {
        console.error(error);
    }
}

// ----- Render Bannières -----
function renderBanners(banners) {
    const container = document.getElementById('bannersContainer');
    container.innerHTML = '';

    banners.forEach(b => {
        const col = document.createElement('div');
        col.classList.add('col-6', 'mb-3');

        col.innerHTML = `
            <div class="card shadow-sm border-bottom-success">
                <div class="card-body">
                    <h6>titre Bannière: ${b.title}</h6>
                    <p><strong>Lien :</strong> ${b.link || '-'}</p>
                    <p><strong>Position :</strong> ${b.position || '-'}</p>
                    <p><strong>Actif :</strong> ${b.is_active ? 'Oui' : 'Non'}</p>

                    <div class="d-flex align-items-center flex-column">
                        <div class="col-12 mb-2">
                            <strong>Image Desktop :</strong><br>
                        ${b.image_url ? `
                        <div class="position-relative me-2">
                            <img src="${API_BASE}/${b.image_url}" alt="Desktop" class="img-fluid" style="max-height:80px; cursor:pointer;" onclick="zoomImage('${API_BASE}/${b.image_url}')">
                            <span class="position-absolute top-0 end-0 badge bg-danger" style="cursor:pointer;" onclick="deleteBanner(${b.id})">&times;</span>
                        </div>` : ''}
                        </div>
                        <div class="col-12 mb-2">
                            <strong>Image Mobile :</strong><br>
                        ${b.image_mobile_url ? `
                        <div class="position-relative">
                            <img src="${API_BASE}/${b.image_mobile_url}" alt="Mobile" class="img-fluid" style="max-height:80px; cursor:pointer;" onclick="zoomImage('${API_BASE}/${b.image_mobile_url}')">
                            <span class="position-absolute top-0 end-0 badge bg-danger" style="cursor:pointer;" onclick="deleteBanner(${b.id})">&times;</span>
                        </div>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.appendChild(col);
    });
}

// ----- Zoom Image -----
function zoomImage(url) {
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = 0;
    modal.style.left = 0;
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.background = 'rgba(0,0,0,0.8)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.cursor = 'pointer';
    modal.innerHTML = `<img src="${url}" style="max-width:90%; max-height:90%;">`;
    modal.onclick = () => document.body.removeChild(modal);
    document.body.appendChild(modal);
}

// ----- Delete Banner -----
async function deleteBanner(id) {
    if (!confirm('Voulez-vous vraiment supprimer cette bannière ?')) return;

    try {
        const response = await fetch(`${API_BASE}/marketing/banner/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Erreur lors de la suppression');

        alert('Bannière supprimée avec succès !');
        fetchBanners();
    } catch (error) {
        console.error(error);
        alert('Erreur lors de la suppression de la bannière');
    }
}

// Initial fetch
fetchBanners();
