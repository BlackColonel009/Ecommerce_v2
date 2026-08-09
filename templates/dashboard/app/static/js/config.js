// window.API_BASE = "https://api.newtechnologiestg.com";

window.API_BASE = "http://localhost:8010";
window.STOREFRONT_BASE = ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://localhost:8011"
    : "https://newtechnologiestg.com";
