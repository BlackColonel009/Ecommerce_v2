<img class="img-fluid banner-img" src="/static/img/Banniere/banni.png" alt="Bannière">

.product-images-wrapper {
  position: relative;
  overflow: hidden; /* évite que l’image zoomée dépasse */
}

.banner-img {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0; /* cachée par défaut */
  transition: opacity 0.4s ease;
  z-index: 1;
}

.main-img {
  position: relative;
  z-index: 2;
  transition: transform 0.4s ease;
}

/* Effet hover */
.product-item:hover .main-img {
  transform: scale(1.1); /* zoom léger */
}

.product-item:hover .banner-img {
  opacity: 1; /* la bannière apparaît */
}

-----------------------------------

set PGPASSWORD=ton_mot_de_passe
pg_dump -U postgres -h 127.0.0.1 -F c -f ecommerce.backup ecommerce
