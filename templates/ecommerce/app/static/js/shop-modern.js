(function () {
    'use strict';

    const filters = document.getElementById('shopFilters');
    const openButton = document.getElementById('openShopFilters');
    const closeButton = document.getElementById('closeShopFilters');

    if (!filters || !openButton || !closeButton) return;

    function setFiltersOpen(open) {
        filters.classList.toggle('is-open', open);
        openButton.setAttribute('aria-expanded', String(open));
        if (open) filters.scrollIntoView({ behavior: 'smooth', block: 'start' });
        else openButton.focus();
    }

    openButton.addEventListener('click', () => setFiltersOpen(true));
    closeButton.addEventListener('click', () => setFiltersOpen(false));

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && filters.classList.contains('is-open')) setFiltersOpen(false);
    });
})();
