var DB = (function () {
  var URL = 'https://grscubobuhzbhnfybrbu.supabase.co';
  var KEY = 'sb_publishable_U9hiugSrQPaDM6SgSy7EBg_5VpydIrO';
  var PAGE_SIZE = 1000;

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

  function fetchPage(offset) {
    return fetch(URL + '/rest/v1/click_events?select=*&order=created_at.asc', {
      headers: {
        'apikey': KEY,
        'Authorization': 'Bearer ' + KEY,
        'Prefer': 'count=exact',
        'Range-Unit': 'items',
        'Range': offset + '-' + (offset + PAGE_SIZE - 1)
      }
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          throw new Error('HTTP ' + res.status + ': ' + t);
        });
      }
      var cr = res.headers.get('Content-Range');
      var total = cr ? parseInt(cr.split('/')[1], 10) : null;
      return res.json().then(function (rows) {
        return { rows: rows, total: total };
      });
    });
  }

  function fetchAll() {
    return fetchPage(0).then(function (first) {
      var allRows = first.rows;
      var total = first.total;

      if (!total || isNaN(total) || allRows.length >= total) {
        return allRows;
      }

      var promises = [];
      for (var offset = PAGE_SIZE; offset < total; offset += PAGE_SIZE) {
        promises.push(fetchPage(offset));
      }

      return Promise.all(promises).then(function (pages) {
        pages.forEach(function (page) {
          allRows = allRows.concat(page.rows);
        });
        return allRows;
      });
    });
  }

  return { insert: insert, fetchAll: fetchAll };
})();
