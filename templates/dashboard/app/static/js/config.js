const isLocalDevelopment = ["localhost", "127.0.0.1"].includes(window.location.hostname);

window.API_BASE = isLocalDevelopment
    ? "http://localhost:8010"
    : "https://api.newtechnologiestg.com";
window.STOREFRONT_BASE = isLocalDevelopment
    ? "http://localhost:8011"
    : "https://newtechnologiestg.com";
