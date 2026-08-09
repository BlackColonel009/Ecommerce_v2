(() => {
    const form = document.getElementById('blogForm');
    const list = document.getElementById('blogPostList');
    const notice = document.getElementById('blogNotice');
    const token = () => localStorage.getItem('access_token');
    const apiImage = path => !path ? '' : (/^(https?:)?\/\//.test(path) ? path : (path.startsWith('/static') ? `${STOREFRONT_BASE}${path}` : `${API_BASE}/${path.replace(/^\/+/, '')}`));
    let posts = [];
    let deleteTarget = null;
    let currentPage = 1;
    let totalPages = 1;
    let totalPosts = 0;
    const pageSize = 10;

    const fields = {
        id: document.getElementById('blogPostId'), title: document.getElementById('blogTitle'), slug: document.getElementById('blogSlug'),
        excerpt: document.getElementById('blogExcerpt'), content: document.getElementById('blogContent'), category: document.getElementById('blogCategory'),
        tags: document.getElementById('blogTags'), products: document.getElementById('blogProducts'), imageAlt: document.getElementById('blogImageAlt'),
        seoTitle: document.getElementById('blogSeoTitle'), seoDescription: document.getElementById('blogSeoDescription'), canonical: document.getElementById('blogCanonical'),
        status: document.getElementById('blogStatus'), publishedAt: document.getElementById('blogPublishedAt'), featured: document.getElementById('blogFeatured'), image: document.getElementById('blogImage')
    };

    function showNotice(message, type = 'success') {
        notice.textContent = message; notice.className = `nt-blog-notice ${type}`; notice.hidden = false;
        window.clearTimeout(showNotice.timer); showNotice.timer = window.setTimeout(() => { notice.hidden = true; }, 5000);
    }

    function authHeaders() { return { Authorization: `Bearer ${token()}` }; }
    function escapeHtml(value = '') { const node = document.createElement('div'); node.textContent = value; return node.innerHTML; }
    function formatDate(value) { return value ? new Date(value).toLocaleDateString('fr-FR') : 'Non publié'; }

    async function loadPosts() {
        const status = document.getElementById('blogStatusFilter').value;
        const q = document.getElementById('blogAdminSearch').value.trim();
        const params = new URLSearchParams({ page: String(currentPage), limit: String(pageSize) }); if (status) params.set('status', status); if (q) params.set('q', q);
        try {
            const response = await fetch(`${API_BASE}/blog/admin/all?${params}`, { headers: authHeaders(), credentials: 'include' });
            if (response.status === 401) { window.location.replace('/login'); return; }
            if (!response.ok) throw new Error('Impossible de charger les articles');
            const result = await response.json();
            posts = result.data || [];
            totalPosts = Number(result.total) || 0;
            totalPages = Math.max(1, Number(result.pages) || 1);
            if (currentPage > totalPages) { currentPage = totalPages; return loadPosts(); }
            renderPosts(); updateCategories(); updatePagination();
        } catch (error) { list.innerHTML = `<div class="text-center text-danger py-5">${escapeHtml(error.message)}</div>`; }
    }

    function renderPosts() {
        document.getElementById('blogPostCount').textContent = `${totalPosts} article${totalPosts !== 1 ? 's' : ''}`;
        if (!posts.length) { list.innerHTML = '<div class="text-center text-muted py-5"><i class="far fa-newspaper fa-2x mb-3"></i><p>Aucun article enregistré.</p></div>'; return; }
        list.innerHTML = posts.map(post => `<article class="nt-post-item" data-id="${post.id}">
            <img src="${escapeHtml(apiImage(post.cover_image) || '/static/img/undraw_posting_photo.svg')}" alt="">
            <div><h3>${escapeHtml(post.title)}</h3><p>${escapeHtml(post.category)} · ${formatDate(post.published_at || post.created_at)}</p><div class="nt-post-item__badges"><span class="is-${post.status}">${post.status === 'published' ? 'Publié' : post.status === 'draft' ? 'Brouillon' : 'Archivé'}</span>${post.is_featured ? '<span>À la une</span>' : ''}</div></div>
            <div class="nt-post-item__actions"><a href="${STOREFRONT_BASE}/blog/${encodeURIComponent(post.slug)}" target="_blank" rel="noopener" title="Voir"><button type="button"><i class="fas fa-eye"></i></button></a><button type="button" data-edit title="Modifier"><i class="fas fa-pen"></i></button><button class="delete" type="button" data-delete title="Supprimer"><i class="fas fa-trash"></i></button></div>
        </article>`).join('');
    }

    function updateCategories() {
        document.getElementById('blogCategories').innerHTML = [...new Set(posts.map(post => post.category).filter(Boolean))].sort().map(value => `<option value="${escapeHtml(value)}"></option>`).join('');
    }

    function updatePagination() {
        const pagination = document.getElementById('blogPagination');
        pagination.hidden = totalPages <= 1;
        document.getElementById('blogPageInfo').textContent = `Page ${currentPage} sur ${totalPages}`;
        document.getElementById('blogPrevPage').disabled = currentPage <= 1;
        document.getElementById('blogNextPage').disabled = currentPage >= totalPages;
    }

    function clearErrors() { form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid')); form.querySelectorAll('[data-field-error]').forEach(el => { el.textContent = ''; }); }
    function fieldError(field, message) { fields[field]?.classList.add('is-invalid'); const target = form.querySelector(`[data-field-error="${field}"]`); if (target) target.textContent = message; fields[field]?.focus(); }

    function resetForm() {
        form.reset(); fields.id.value = ''; fields.category.value = 'Conseils'; fields.status.value = 'draft';
        document.getElementById('editorTitle').textContent = 'Nouvel article'; document.getElementById('resetBlogForm').hidden = true;
        document.getElementById('blogSubmit').querySelector('span').textContent = 'Enregistrer l’article';
        document.getElementById('blogImagePreview').innerHTML = '<i class="far fa-image"></i><span>Aperçu de l’image</span>'; clearErrors(); updateCount();
    }

    function editPost(post) {
        fields.id.value = post.id; fields.title.value = post.title || ''; fields.slug.value = post.slug || ''; fields.excerpt.value = post.excerpt || '';
        fields.content.value = post.content || ''; fields.category.value = post.category || 'Conseils'; fields.tags.value = post.tags || ''; fields.products.value = post.related_product_slugs || '';
        fields.imageAlt.value = post.image_alt || ''; fields.seoTitle.value = post.seo_title || ''; fields.seoDescription.value = post.seo_description || ''; fields.canonical.value = post.canonical_url || '';
        fields.status.value = post.status; fields.featured.checked = Boolean(post.is_featured); fields.publishedAt.value = post.published_at ? new Date(post.published_at).toISOString().slice(0,16) : '';
        document.getElementById('editorTitle').textContent = 'Modifier l’article'; document.getElementById('resetBlogForm').hidden = false; document.getElementById('blogSubmit').querySelector('span').textContent = 'Mettre à jour l’article';
        if (post.cover_image) document.getElementById('blogImagePreview').innerHTML = `<img src="${escapeHtml(apiImage(post.cover_image))}" alt="">`;
        clearErrors(); updateCount(); window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function dialog(title, message, confirm = null) {
        const modal = document.getElementById('blogDialog'); document.getElementById('blogDialogTitle').textContent = title; document.getElementById('blogDialogMessage').textContent = message;
        deleteTarget = confirm; document.getElementById('blogDialogCancel').hidden = !confirm; document.getElementById('blogDialogConfirm').textContent = confirm ? 'Supprimer' : 'Fermer'; modal.hidden = false;
    }
    function closeDialog() { document.getElementById('blogDialog').hidden = true; deleteTarget = null; }

    async function submitPost(event) {
        event.preventDefault(); clearErrors();
        if (fields.title.value.trim().length < 4) { fieldError('title', 'Ajoutez un titre d’au moins 4 caractères.'); return; }
        if (fields.content.value.trim().length < 20) { fieldError('content', 'Le contenu doit contenir au moins 20 caractères.'); return; }
        const data = new FormData(form); data.set('is_featured', String(fields.featured.checked)); if (!fields.publishedAt.value) data.delete('published_at'); if (!fields.image.files.length) data.delete('image');
        const id = fields.id.value; const button = document.getElementById('blogSubmit'); button.disabled = true;
        try {
            const response = await fetch(`${API_BASE}/blog/admin${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', headers: authHeaders(), credentials: 'include', body: data });
            const result = await response.json(); if (!response.ok) throw new Error(result.detail || 'Enregistrement impossible');
            showNotice(id ? 'Article mis à jour avec succès.' : 'Article créé avec succès.'); resetForm(); currentPage = 1; await loadPosts();
        } catch (error) { showNotice(error.message, 'error'); dialog('Enregistrement impossible', error.message); }
        finally { button.disabled = false; }
    }

    function updateCount() { const count = fields.content.value.length; document.getElementById('contentCount').textContent = `${count} caractère${count !== 1 ? 's' : ''}`; }
    let searchTimer;
    document.getElementById('viewPublicBlog').href = `${STOREFRONT_BASE}/blog`;
    form.addEventListener('submit', submitPost); fields.content.addEventListener('input', updateCount); document.getElementById('resetBlogForm').addEventListener('click', resetForm);
    document.getElementById('toggleBlogPreview').addEventListener('click', () => { const preview = document.getElementById('blogContentPreview'); preview.textContent = `${fields.title.value.trim() || 'Titre de l’article'}\n\n${fields.content.value.trim() || 'Le contenu apparaîtra ici.'}`; preview.hidden = !preview.hidden; });
    fields.image.addEventListener('change', () => { const file = fields.image.files[0]; if (file) document.getElementById('blogImagePreview').innerHTML = `<img src="${URL.createObjectURL(file)}" alt="Aperçu">`; });
    list.addEventListener('click', event => { const item = event.target.closest('.nt-post-item'); if (!item) return; const post = posts.find(value => value.id === Number(item.dataset.id)); if (event.target.closest('[data-edit]')) editPost(post); if (event.target.closest('[data-delete]')) dialog('Supprimer cet article ?', `« ${post.title} » sera définitivement supprimé.`, post.id); });
    document.getElementById('blogDialogCancel').addEventListener('click', closeDialog); document.getElementById('blogDialogConfirm').addEventListener('click', async () => { if (!deleteTarget) { closeDialog(); return; } const id = deleteTarget; try { const response = await fetch(`${API_BASE}/blog/admin/${id}`, { method:'DELETE', headers:authHeaders(), credentials:'include' }); if (!response.ok) throw new Error('Suppression impossible'); closeDialog(); showNotice('Article supprimé.'); await loadPosts(); } catch(error) { closeDialog(); showNotice(error.message,'error'); } });
    document.getElementById('blogStatusFilter').addEventListener('change', () => { currentPage = 1; loadPosts(); }); document.getElementById('blogAdminSearch').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { currentPage = 1; loadPosts(); }, 300); });
    document.getElementById('blogPrevPage').addEventListener('click', () => { if (currentPage > 1) { currentPage -= 1; loadPosts(); } });
    document.getElementById('blogNextPage').addEventListener('click', () => { if (currentPage < totalPages) { currentPage += 1; loadPosts(); } });
    loadPosts(); updateCount();
})();
