/* ----------------------------------------------------------------
   Preview password gate (GitHub Pages preview only — remove at launch).

   Loaded synchronously in every page's <head>, before anything paints.
   If the preview password has not been entered on this browser, the
   page is hidden at once and the browser is sent to password.html,
   which carries the address to come back to (?next=). The password
   itself is not in the code, only its SHA-256 hash (see password.html);
   once it matches, the browser remembers it (localStorage) for every page.

   This keeps casual visitors out of the preview. It is not real
   security: the site is static, so the HTML is still downloadable and
   the repository is public. Search engines are kept out separately by
   robots.txt and the `<meta name="robots" content="noindex…">` tag on
   every page.
   ---------------------------------------------------------------- */
(function () {
  var HASH = '6c39072d1be89857ae23e012d6e0cfff9fa4b80db5f5662b5e4b9f051e820bdd';
  try { if (localStorage.getItem('dhc-preview') === HASH) return; } catch (e) {}

  /* nothing of the page shows while the browser leaves for the gate */
  document.documentElement.style.display = 'none';
  var path = window.location.pathname;
  var here = path.slice(path.lastIndexOf('/') + 1) || 'index.html';
  var next = here + window.location.search + window.location.hash;
  window.location.replace('password.html?next=' + encodeURIComponent(next));
})();
