(function () {
  function init() {
    var btn = document.getElementById('btn-top');
    if (!btn) {
      btn = document.createElement('a');
      btn.id = 'btn-top';
      btn.href = '#top';
      btn.setAttribute('aria-label', 'Наверх');
      document.body.appendChild(btn);
    }

    function sync() {
      if (window.scrollY > 300 || document.documentElement.scrollTop > 300) {
        btn.classList.add('show');
      } else {
        btn.classList.remove('show');
      }
    }

    window.addEventListener('scroll', sync, { passive: true });
    sync();

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
