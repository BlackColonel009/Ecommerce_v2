(() => {
    const escape = value => { const el = document.createElement('div'); el.textContent = value || ''; return el.innerHTML; };
    const imageUrl = path => !path ? '/static/img/software/tradecare.png' : (/^(https?:)?\/\//.test(path) ? path : `${(window.API || '').replace(/\/$/, '')}/${path.replace(/^\/+/, '')}`);
    const platformIcon = name => /mobile|android|ios/i.test(name) ? 'fa-mobile-alt' : /web|cloud|saas/i.test(name) ? 'fa-cloud' : 'fa-desktop';
    const safeLink = value => value && /^(https?:\/\/|\/)/i.test(value) ? value : '';
    const card = item => {
        const features = (item.feature_list || []).map(feature => `<li>${escape(feature)}</li>`).join('');
        const platforms = (item.platform_list || []).map(platform => `<span class="platform"><i class="fas ${platformIcon(platform)}"></i> ${escape(platform)}</span>`).join('');
        const discover = safeLink(item.discover_url); const trial = safeLink(item.trial_url); const download = safeLink(item.download_url);
        const actions = [discover && `<a href="${escape(discover)}" class="btn btn-primary btn-sm mr-2" target="_blank" rel="noopener">Découvrir</a>`, trial && `<a href="${escape(trial)}" class="btn btn-prestige-3d primary btn-sm mr-2" target="_blank" rel="noopener">Essayer</a>`, download && `<a href="${escape(download)}" class="btn btn-outline-primary btn-sm" target="_blank" rel="noopener"><i class="fas fa-download mr-1"></i>Télécharger</a>`].filter(Boolean).join('');
        return `<div class="col-md-6 col-lg-4 mb-4"><article class="card h-100 border-0 shadow-hover software-card"><div class="position-relative overflow-hidden"><span class="badge badge-primary software-badge">${escape(item.badge || 'Logiciel')}</span><img src="${escape(imageUrl(item.image_url))}" alt="${escape(item.image_alt || item.name)}" class="img-fluid w-100 software-img" loading="lazy"><div class="software-overlay"><p class="text-white mb-0">${escape(item.short_description || item.name)}</p></div></div><div class="card-body text-center"><h3 class="h5 font-weight-bold mb-2">${escape(item.name)}</h3><p class="text-muted small mb-3">${escape(item.short_description || '')}</p>${features ? `<ul class="software-features">${features}</ul>` : ''}${item.description ? `<p class="small text-dark mt-3">${escape(item.description)}</p>` : ''}<div class="software-actions mt-4">${actions || '<span class="text-muted small">Bientôt disponible</span>'}</div></div>${platforms ? `<div class="software-platforms mb-3">${platforms}</div>` : ''}</article></div>`;
    };
    async function loadSoftware() {
        const target = document.getElementById('softwareCatalog');
        if (!target) return;
        try { const response = await fetch(`${(window.API || '').replace(/\/$/, '')}/software/`); if (!response.ok) throw new Error(); const data = await response.json(); if (Array.isArray(data) && data.length) target.innerHTML = data.map(card).join(''); } catch (_) { /* La carte Trade Care existante reste visible en secours. */ }
    }
    document.addEventListener('DOMContentLoaded', loadSoftware);
})();
