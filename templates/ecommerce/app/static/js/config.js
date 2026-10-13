const isLocalDevelopment = ["localhost", "127.0.0.1"].includes(window.location.hostname);
window.API = isLocalDevelopment
    ? "http://localhost:8001"
    : "https://api.newtechnologiestg.com";
