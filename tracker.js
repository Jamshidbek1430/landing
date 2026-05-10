(function () {
  var script = document.currentScript || document.querySelector('script[data-page]');
  var PAGE_ID = script ? script.getAttribute('data-page') : 'unknown';

  var sessionId = '';
  try {
    sessionId = localStorage.getItem('_ct_sid') || '';
    if (!sessionId) {
      sessionId = 'xxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      }) + '-' + Date.now().toString(36);
      localStorage.setItem('_ct_sid', sessionId);
    }
  } catch (e) {}

  function send(payload) {
    DB.insert(payload);
  }

  // All pages have a full-page overlay <a> so every click lands on it.
  // Section is determined purely by Y position — 2 sections per page.
  function detectSection(yPct) {
    if (PAGE_ID === 'white') {
      return yPct < 50 ? 'Har sahifa' : 'Jonli Darsda Siz';
    }
    return yPct < 50 ? 'Birinchi qism' : 'CTA (Tugma)';
  }

  function getLabel(el) {
    var node = el;
    var limit = 5;
    while (node && limit-- > 0) {
      var tag = node.tagName ? node.tagName.toLowerCase() : '';
      if (['a', 'button', 'input', 'select', 'label'].indexOf(tag) !== -1) break;
      node = node.parentElement;
    }
    return ((node || el).innerText || (node || el).textContent || '')
      .replace(/\s+/g, ' ').trim().slice(0, 80);
  }

  // Track page visit on load
  window.addEventListener('load', function () {
    send({
      page: PAGE_ID,
      event_type: 'pageview',
      x_percent: null,
      y_percent: null,
      x_px: null,
      y_px: null,
      element_tag: null,
      element_text: null,
      element_id: null,
      element_class: null,
      section: null,
      session_id: sessionId,
      screen_width: window.screen.width,
      screen_height: window.screen.height
    });
  });

  // Track clicks
  document.addEventListener('click', function (e) {
    var target = e.target;

    var scrollY = window.scrollY || window.pageYOffset || 0;
    var totalH = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      1
    );

    var xPct = parseFloat(((e.clientX / window.innerWidth) * 100).toFixed(2));
    var yPct = parseFloat((((e.clientY + scrollY) / totalH) * 100).toFixed(2));
    var section = detectSection(yPct);

    send({
      page: PAGE_ID,
      event_type: 'click',
      x_percent: xPct,
      y_percent: yPct,
      x_px: Math.round(e.clientX),
      y_px: Math.round(e.clientY + scrollY),
      element_tag: (target.tagName || '').toLowerCase(),
      element_text: getLabel(target),
      element_id: target.id || null,
      element_class: (target.className && typeof target.className === 'string')
        ? target.className.trim().slice(0, 120) : null,
      section: section,
      session_id: sessionId,
      screen_width: window.screen.width,
      screen_height: window.screen.height
    });

  }, true);
})();
