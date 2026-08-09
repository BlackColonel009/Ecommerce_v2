(function () {
    'use strict';

    const rates = { XOF: 1, USD: 1 / 650, EUR: 1 / 700 };
    const currencies = {
        XOF: { symbol: 'XOF', country: 'TG', locale: 'fr-FR', digits: 0 },
        USD: { symbol: '$', country: 'US', locale: 'en-US', digits: 2 },
        EUR: { symbol: '€', country: 'EU', locale: 'fr-FR', digits: 2 }
    };

    let selectedCurrency = localStorage.getItem('currency') || 'XOF';
    if (!currencies[selectedCurrency]) selectedCurrency = 'XOF';

    let selectedCountry = localStorage.getItem('country') || currencies[selectedCurrency].country;
    let refreshQueued = false;

    function updateCurrencyDisplay() {
        const display = document.getElementById('currentCurrency');
        if (!display) return;
        display.textContent = `${currencies[selectedCurrency].symbol} (${selectedCountry})`;
    }

    function convertPrice(element) {
        const rawPrice = String(element.dataset.fcfa || '').replace(/\s/g, '').replace(',', '.');
        const xofPrice = Number.parseFloat(rawPrice);
        if (!Number.isFinite(xofPrice)) return;

        const config = currencies[selectedCurrency];
        const converted = xofPrice * rates[selectedCurrency];
        const formatted = new Intl.NumberFormat(config.locale, {
            minimumFractionDigits: config.digits,
            maximumFractionDigits: config.digits
        }).format(converted);

        element.textContent = `${config.symbol} ${formatted}`;
    }

    function convertPrices(root = document) {
        if (root.matches?.('.js-price')) convertPrice(root);
        root.querySelectorAll?.('.js-price').forEach(convertPrice);
    }

    function refreshCurrency() {
        updateCurrencyDisplay();
        convertPrices();
    }

    function closeDropdown() {
        const currency = document.querySelector('.nt-currency');
        const invoker = document.getElementById('currencyDropdownInvoker');
        currency?.classList.remove('is-open');
        invoker?.setAttribute('aria-expanded', 'false');
    }

    function toggleDropdown() {
        const currency = document.querySelector('.nt-currency');
        const invoker = document.getElementById('currencyDropdownInvoker');
        if (!currency || !invoker) return;

        const willOpen = !currency.classList.contains('is-open');
        currency.classList.toggle('is-open', willOpen);
        invoker.setAttribute('aria-expanded', String(willOpen));
    }

    document.addEventListener('click', (event) => {
        const item = event.target.closest('#currencyDropdown .dropdown-item');
        if (item) {
            event.preventDefault();
            selectedCurrency = item.dataset.currency;
            selectedCountry = item.dataset.country || currencies[selectedCurrency].country;
            localStorage.setItem('currency', selectedCurrency);
            localStorage.setItem('country', selectedCountry);
            refreshCurrency();
            closeDropdown();
            document.dispatchEvent(new CustomEvent('currencyChanged', {
                detail: { currency: selectedCurrency, country: selectedCountry }
            }));
            return;
        }

        if (event.target.closest('#currencyDropdownInvoker')) {
            event.preventDefault();
            toggleDropdown();
            return;
        }

        if (!event.target.closest('.nt-currency')) closeDropdown();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeDropdown();
            document.getElementById('currencyDropdownInvoker')?.focus();
        }
    });

    document.addEventListener('navContainerLoaded', refreshCurrency);

    document.addEventListener('DOMContentLoaded', () => {
        refreshCurrency();

        const observer = new MutationObserver((mutations) => {
            const hasNewPrices = mutations.some((mutation) => Array.from(mutation.addedNodes).some((node) =>
                node.nodeType === Node.ELEMENT_NODE && (node.matches?.('.js-price') || node.querySelector?.('.js-price'))
            ));

            if (!hasNewPrices || refreshQueued) return;
            refreshQueued = true;
            requestAnimationFrame(() => {
                convertPrices();
                refreshQueued = false;
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    });

    window.refreshCurrencyPrices = convertPrices;
})();
