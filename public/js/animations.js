(() => {
  // ===== SCROLL REVEAL =====
  const revealElements = document.querySelectorAll(
    '.section-header, .products-grid, .hits-carousel-wrapper, .occasions-row, .how-grid, .reviews-grid, .footer-grid, .how-step, .review-card, .product-card'
  );

  revealElements.forEach(el => el.classList.add('reveal'));

  const staggerContainers = document.querySelectorAll(
    '.occasions-row, .how-grid, .reviews-grid, .products-grid'
  );
  staggerContainers.forEach(el => {
    el.classList.add('reveal-stagger');
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -60px 0px'
  });

  revealElements.forEach(el => observer.observe(el));

  // ===== HEADER SCROLL =====
  const header = document.querySelector('.header');
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    if (scrollY > 80) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
    lastScroll = scrollY;
  }, { passive: true });
})();
