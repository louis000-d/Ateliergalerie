/* ============================================
   ATELIER GALERIE — SCRIPT.JS
   Navigation à 2 niveaux : Villes → Album → Commande
   + Gestion du formulaire d'Avis Clients (Livre d'Or)
   ============================================ */

(function () {
  'use strict';

  /* ==========================================
     ⚙️ CONFIGURATION — À PERSONNALISER
     ========================================== */
  const CONFIG = {
    FORMSPREE_ENDPOINT: 'https://formspree.io/f/xljrqndb',
    PAYPAL_USERNAME: 'LouisDeniel895',
    CURRENCY_SYMBOL: '€'
  };

  /* ==========================================
     ÉTAT GLOBAL
     ========================================== */
  let allCities = [];
  let currentCity = null;
  let currentPoster = null;
  let currentCategory = 'all';
  let lastFocusedElement = null;
  let lastFocusedElementReview = null;

  /* ==========================================
     SÉLECTEURS DOM — Page d'accueil
     ========================================== */
  const cityGrid = document.getElementById('city-grid');
  const filterButtons = document.querySelectorAll('.filter-btn');

  /* ==========================================
     SÉLECTEURS DOM — Album (Collection Ville)
     ========================================== */
  const albumModal = document.getElementById('album-modal');
  const albumCountry = document.getElementById('album-country');
  const albumTitle = document.getElementById('album-title');
  const albumSubtitle = document.getElementById('album-subtitle');
  const albumPosterGrid = document.getElementById('album-poster-grid');
  const albumCloseTriggers = document.querySelectorAll('[data-close-album]');

  /* ==========================================
     SÉLECTEURS DOM — Modal Commande
     ========================================== */
  const productModal = document.getElementById('poster-modal');
  const modalImage = document.getElementById('modal-image');
  const modalCategory = document.getElementById('modal-category');
  const modalLocation = document.getElementById('modal-location');
  const modalTitle = document.getElementById('modal-title');
  const modalDescription = document.getElementById('modal-description');
  const fieldPosterId = document.getElementById('field-poster-id');
  const fieldPosterTitle = document.getElementById('field-poster-title');
  const fieldSize = document.getElementById('field-size');
  const fieldQuantity = document.getElementById('field-quantity');
  const orderForm = document.getElementById('order-form');
  const formTotalAmount = document.getElementById('form-total-amount');
  const formError = document.getElementById('form-error');
  const submitBtn = document.getElementById('submit-btn');
  const submitBtnText = document.getElementById('submit-btn-text');
  const productCloseTriggers = document.querySelectorAll('[data-close-modal]');
  const backToAlbumBtn = document.querySelector('[data-back-to-album]');

  /* ==========================================
     SÉLECTEURS DOM — Modal Avis Client
     ========================================== */
  const openReviewBtn = document.getElementById('open-review-btn');
  const reviewModal = document.getElementById('review-modal');
  const reviewCloseTriggers = document.querySelectorAll('[data-close-review]');
  const reviewForm = document.getElementById('review-form');
  const reviewError = document.getElementById('review-error');
  const reviewSuccess = document.getElementById('review-success');
  const reviewSubmitBtn = document.getElementById('review-submit-btn');
  const reviewSubmitBtnText = document.getElementById('review-submit-btn-text');

  /* ==========================================
     CHARGEMENT DES DONNÉES (posters.json)
     ========================================== */
  async function loadCities() {
    try {
      const response = await fetch('posters.json');
      if (!response.ok) {
        throw new Error('Impossible de charger les collections (HTTP ' + response.status + ')');
      }
      allCities = await response.json();
      renderCities(allCities);
    } catch (error) {
      cityGrid.innerHTML =
        '<p class="empty-state">Une erreur est survenue lors du chargement des collections. Merci de réessayer plus tard.</p>';
      console.error('[Atelier Galerie] Erreur de chargement des collections :', error);
    }
  }

  function escapeHtml(str) {
    if (str === undefined || str === null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* ==========================================
     NIVEAU 1 — RENDU DE LA GRILLE DE VILLES
     ========================================== */
  function renderCities(cities) {
    if (!cities || cities.length === 0) {
      cityGrid.innerHTML = '<p class="empty-state">Aucune collection ne correspond à cette catégorie.</p>';
      return;
    }

    const cardsHtml = cities
      .map(function (city, index) {
        const count = (city.posters || []).length;
        const countLabel = count === 1 ? '1 affiche' : count + ' affiches';

        return (
          '<article class="city-card" data-city-id="' + escapeHtml(city.cityId) + '" ' +
          'tabindex="0" role="button" ' +
          'aria-label="Découvrir la collection ' + escapeHtml(city.cityName) + '" ' +
          'style="animation-delay:' + (index * 0.05) + 's">' +
            '<div class="city-card-image-wrap">' +
              '<img class="city-card-image" src="' + escapeHtml(city.coverImage) + '" alt="Photo de couverture de la collection ' + escapeHtml(city.cityName) + ', ' + escapeHtml(city.country) + '" loading="lazy">' +
              '<span class="city-card-category">' + escapeHtml(city.category) + '</span>' +
              '<span class="city-card-count">' + countLabel + '</span>' +
            '</div>' +
            '<div class="city-card-body">' +
              '<p class="city-card-country">' + escapeHtml(city.country) + '</p>' +
              '<h3 class="city-card-title">' + escapeHtml(city.cityName) + '</h3>' +
              '<p class="city-card-subtitle">' + escapeHtml(city.subtitle) + '</p>' +
              '<div class="city-card-footer">' +
                '<span class="city-card-cta">Voir la collection →</span>' +
              '</div>' +
            '</div>' +
          '</article>'
        );
      })
      .join('');

    cityGrid.innerHTML = cardsHtml;

    document.querySelectorAll('.city-card').forEach(function (card) {
      card.addEventListener('click', function () {
        openAlbumModal(card.dataset.cityId);
      });
      card.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openAlbumModal(card.dataset.cityId);
        }
      });
    });
  }

  /* ==========================================
     FILTRAGE PAR CATÉGORIE (Villes)
     ========================================== */
  filterButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      currentCategory = btn.dataset.category;

      filterButtons.forEach(function (b) {
        b.classList.remove('is-active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('is-active');
      btn.setAttribute('aria-pressed', 'true');

      const filtered =
        currentCategory === 'all'
          ? allCities
          : allCities.filter(function (c) { return c.category === currentCategory; });

      renderCities(filtered);
    });
  });

  /* ==========================================
     NIVEAU 2 — OUVERTURE DE L'ALBUM D'UNE VILLE
     ========================================== */
  function openAlbumModal(cityId) {
    const city = allCities.find(function (c) { return c.cityId === cityId; });
    if (!city) return;

    currentCity = city;
    lastFocusedElement = document.activeElement;

    albumCountry.textContent = city.country;
    albumTitle.textContent = city.cityName;
    albumSubtitle.textContent = city.subtitle;

    const postersHtml = (city.posters || [])
      .map(function (poster) {
        const sizes = poster.sizes || Object.keys(poster.price || {});
        const minSize = sizes[0] || 'A4';
        const minPrice = poster.price ? poster.price[minSize] : '—';

        return (
          '<article class="album-poster-card" data-poster-id="' + escapeHtml(poster.id) + '" ' +
          'tabindex="0" role="listitem button" ' +
          'aria-label="Voir la fiche produit de l\'affiche ' + escapeHtml(poster.title) + '">' +
            '<div class="album-poster-image-wrap">' +
              '<img class="album-poster-image" src="' + escapeHtml(poster.image) + '" alt="' + escapeHtml(poster.alt || poster.title) + '" loading="lazy">' +
            '</div>' +
            '<div class="album-poster-body">' +
              '<h3 class="album-poster-title">' + escapeHtml(poster.title) + '</h3>' +
              '<div class="album-poster-footer">' +
                '<span class="album-poster-price">Dès ' + minPrice + CONFIG.CURRENCY_SYMBOL + ' <small>(' + minSize + ')</small></span>' +
                '<span class="album-poster-cta">Voir →</span>' +
              '</div>' +
            '</div>' +
          '</article>'
        );
      })
      .join('');

    albumPosterGrid.innerHTML = postersHtml;

    albumPosterGrid.querySelectorAll('.album-poster-card').forEach(function (card) {
      card.addEventListener('click', function () {
        openProductModal(card.dataset.posterId);
      });
      card.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openProductModal(card.dataset.posterId);
        }
      });
    });

    albumModal.classList.add('is-open');
    albumModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    const closeBtn = albumModal.querySelector('.modal-close');
    if (closeBtn) closeBtn.focus();

    document.addEventListener('keydown', handleAlbumEscapeKey);
  }

  function closeAlbumModal() {
    albumModal.classList.remove('is-open');
    albumModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleAlbumEscapeKey);

    if (lastFocusedElement) {
      lastFocusedElement.focus();
    }
  }

  function handleAlbumEscapeKey(event) {
    if (event.key === 'Escape') {
      closeAlbumModal();
    }
  }

  albumCloseTriggers.forEach(function (trigger) {
    trigger.addEventListener('click', closeAlbumModal);
  });

  /* ==========================================
     NIVEAU 3 — OUVERTURE DE LA MODAL DE COMMANDE
     ========================================== */
  function openProductModal(posterId) {
    if (!currentCity) return;
    const poster = (currentCity.posters || []).find(function (p) { return p.id === posterId; });
    if (!poster) return;

    currentPoster = poster;

    modalImage.src = poster.image;
    modalImage.alt = poster.alt || poster.title;
    modalCategory.textContent = currentCity.category;
    modalLocation.textContent = currentCity.cityName + ', ' + currentCity.country;
    modalTitle.textContent = poster.title;
    modalDescription.textContent = poster.description;

    const sizes = poster.sizes || Object.keys(poster.price || {});
    fieldSize.innerHTML = sizes
      .map(function (size) {
        const price = poster.price ? poster.price[size] : 0;
        return '<option value="' + escapeHtml(size) + '" data-price="' + price + '">' +
          escapeHtml(size) + ' — ' + price + CONFIG.CURRENCY_SYMBOL + '</option>';
      })
      .join('');

    formError.hidden = true;
    formError.textContent = '';
    orderForm.reset();
    fieldPosterId.value = poster.id;
    fieldPosterTitle.value = poster.title + ' (' + currentCity.cityName + ')';
    fieldSize.value = sizes[0];
    fieldQuantity.value = 1;

    updateTotal();

    if (backToAlbumBtn) backToAlbumBtn.classList.add('is-visible');

    productModal.classList.add('is-open');
    productModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    const closeBtn = productModal.querySelector('.modal-close');
    if (closeBtn) closeBtn.focus();

    document.addEventListener('keydown', handleProductEscapeKey);
  }

  function closeProductModal() {
    productModal.classList.remove('is-open');
    productModal.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', handleProductEscapeKey);

    if (albumModal.classList.contains('is-open')) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  function handleProductEscapeKey(event) {
    if (event.key === 'Escape') {
      closeProductModal();
    }
  }

  productCloseTriggers.forEach(function (trigger) {
    trigger.addEventListener('click', closeProductModal);
  });

  /* ==========================================
     BOUTON "RETOUR À LA COLLECTION"
     ========================================== */
  if (backToAlbumBtn) {
    backToAlbumBtn.addEventListener('click', function () {
      closeProductModal();
    });
  }

  /* ==========================================
     CALCUL DU TOTAL EN TEMPS RÉEL
     ========================================== */
  function updateTotal() {
    const selectedOption = fieldSize.options[fieldSize.selectedIndex];
    const unitPrice = selectedOption ? parseFloat(selectedOption.dataset.price) : 0;
    const quantity = Math.max(1, parseInt(fieldQuantity.value, 10) || 1);
    const total = unitPrice * quantity;

    formTotalAmount.textContent = total.toFixed(0) + '\u00A0' + CONFIG.CURRENCY_SYMBOL;
    return total;
  }

  fieldSize.addEventListener('change', updateTotal);
  fieldQuantity.addEventListener('input', updateTotal);

  /* ==========================================
     SOUMISSION DU FORMULAIRE DE COMMANDE → FORMSPREE → PAYPAL
     ========================================== */
  orderForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    formError.hidden = true;
    formError.textContent = '';

    if (!orderForm.checkValidity()) {
      orderForm.reportValidity();
      return;
    }

    if (CONFIG.FORMSPREE_ENDPOINT.indexOf('VOTRE_ID_FORMSPREE') !== -1) {
      formError.hidden = false;
      formError.textContent =
        'Configuration requise : merci de remplacer VOTRE_ID_FORMSPREE dans script.js par votre identifiant Formspree.';
      return;
    }

    const total = updateTotal();
    const formData = new FormData(orderForm);
    formData.append('Montant_Total', total.toFixed(2) + ' ' + CONFIG.CURRENCY_SYMBOL);
    if (currentCity) {
      formData.append('Ville_Collection', currentCity.cityName + ', ' + currentCity.country);
    }

    submitBtn.disabled = true;
    submitBtnText.textContent = 'Envoi en cours…';

    try {
      const response = await fetch(CONFIG.FORMSPREE_ENDPOINT, {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur Formspree, statut HTTP ' + response.status);
      }

      redirectToPayPal(total, formData);
    } catch (error) {
      console.error('[Atelier Galerie] Erreur lors de l\'envoi du formulaire :', error);
      formError.hidden = false;
      formError.textContent =
        'Une erreur est survenue lors de l\'envoi de votre commande. Merci de vérifier votre connexion et de réessayer.';
      submitBtn.disabled = false;
      submitBtnText.textContent = 'Valider ma commande & payer avec PayPal';
    }
  });

  /* ==========================================
     REDIRECTION VERS PAYPAL.ME
     ========================================== */
  function redirectToPayPal(total, formData) {
    if (CONFIG.PAYPAL_USERNAME.indexOf('VOTRE_PSEUDO_PAYPAL') !== -1) {
      formError.hidden = false;
      formError.textContent =
        'Configuration requise : merci de remplacer VOTRE_PSEUDO_PAYPAL dans script.js par votre identifiant PayPal.Me.';
      submitBtn.disabled = false;
      submitBtnText.textContent = 'Valider ma commande & payer avec PayPal';
      return;
    }

    const noteParts = [
      'Commande Atelier Galerie',
      formData.get('Affiche_Choisie'),
      'Format ' + formData.get('Format'),
      'Qte ' + formData.get('Quantite'),
      formData.get('Prenom') + ' ' + formData.get('Nom')
    ];
    const note = encodeURIComponent(noteParts.join(' | '));
    const amount = total.toFixed(2);

    const paypalUrl =
      'https://paypal.me/' + CONFIG.PAYPAL_USERNAME + '/' + amount + 'EUR?note=' + note;

    submitBtnText.textContent = 'Redirection vers PayPal…';

    setTimeout(function () {
      window.location.href = paypalUrl;
    }, 600);
  }

  /* ==========================================
     MODAL "LAISSER UN AVIS" — OUVERTURE / FERMETURE
     ========================================== */
  function openReviewModal() {
    lastFocusedElementReview = document.activeElement;

    reviewError.hidden = true;
    reviewError.textContent = '';
    reviewSuccess.hidden = true;
    reviewForm.reset();
    reviewForm.hidden = false;
    reviewSubmitBtn.disabled = false;
    reviewSubmitBtnText.textContent = 'Envoyer mon avis';

    reviewModal.classList.add('is-open');
    reviewModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    const closeBtn = reviewModal.querySelector('.modal-close');
    if (closeBtn) closeBtn.focus();

    document.addEventListener('keydown', handleReviewEscapeKey);
  }

  function closeReviewModal() {
    reviewModal.classList.remove('is-open');
    reviewModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleReviewEscapeKey);

    if (lastFocusedElementReview) {
      lastFocusedElementReview.focus();
    }
  }

  function handleReviewEscapeKey(event) {
    if (event.key === 'Escape') {
      closeReviewModal();
    }
  }

  if (openReviewBtn) {
    openReviewBtn.addEventListener('click', openReviewModal);
  }

  reviewCloseTriggers.forEach(function (trigger) {
    trigger.addEventListener('click', closeReviewModal);
  });

  /* ==========================================
     SOUMISSION DU FORMULAIRE D'AVIS → FORMSPREE
     ========================================== */
  reviewForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    reviewError.hidden = true;
    reviewError.textContent = '';
    reviewSuccess.hidden = true;

    if (!reviewForm.checkValidity()) {
      reviewForm.reportValidity();
      return;
    }

    if (CONFIG.FORMSPREE_ENDPOINT.indexOf('VOTRE_ID_FORMSPREE') !== -1) {
      reviewError.hidden = false;
      reviewError.textContent =
        'Configuration requise : merci de remplacer VOTRE_ID_FORMSPREE dans script.js par votre identifiant Formspree.';
      return;
    }

    const reviewData = new FormData(reviewForm);
    reviewData.append('_subject', 'Nouvel avis client — Atelier Galerie');

    reviewSubmitBtn.disabled = true;
    reviewSubmitBtnText.textContent = 'Envoi en cours…';

    try {
      const response = await fetch(CONFIG.FORMSPREE_ENDPOINT, {
        method: 'POST',
        body: reviewData,
        headers: {
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur Formspree, statut HTTP ' + response.status);
      }

      reviewForm.hidden = true;
      reviewSuccess.hidden = false;

      setTimeout(function () {
        closeReviewModal();
      }, 2200);
    } catch (error) {
      console.error('[Atelier Galerie] Erreur lors de l\'envoi de l\'avis :', error);
      reviewError.hidden = false;
      reviewError.textContent =
        'Une erreur est survenue lors de l\'envoi de votre avis. Merci de vérifier votre connexion et de réessayer.';
      reviewSubmitBtn.disabled = false;
      reviewSubmitBtnText.textContent = 'Envoyer mon avis';
    }
  });

  /* ==========================================
     INITIALISATION
     ========================================== */
  loadCities();
})();
