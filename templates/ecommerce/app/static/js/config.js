const isLocalDevelopment = ["localhost", "127.0.0.1"].includes(window.location.hostname);
window.API = isLocalDevelopment
    ? "http://localhost:8010"
    : "https://api.newtechnologiestg.com";
