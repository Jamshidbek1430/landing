var DB = (function () {
  var URL = 'https://grscubobuhzbhnfybrbu.supabase.co';
  var KEY = 'sb_publishable_U9hiugSrQPaDM6SgSy7EBg_5VpydIrO';

  function insert(payload) {
    try {
      fetch(URL + '/rest/v1/click_events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': KEY,
          'Authorization': 'Bearer ' + KEY,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }

  function fetchAll() {
    return fetch(URL + '/rest/v1/click_events?select=*&order=created_at.desc&limit=10000', {
      headers: {
        'apikey': KEY,
        'Authorization': 'Bearer ' + KEY
      }
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          throw new Error('HTTP ' + res.status + ': ' + t);
        });
      }
      return res.json();
    });
  }

  return { insert: insert, fetchAll: fetchAll };
})();
