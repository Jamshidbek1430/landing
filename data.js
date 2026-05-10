var DB = (function () {
  var URL = 'https://grscubobuhzbhnfybrbu.supabase.co';
  var KEY = 'sb_publishable_U9hiugSrQPaDM6SgSy7EBg_5VpydIrO';
  var PAGE_SIZE = 1000;

  var HEADERS = {
    'Content-Type': 'application/json',
    'apikey': KEY,
    'Authorization': 'Bearer ' + KEY,
    'Prefer': 'return=minimal'
  };

  function insert(payload) {
    try {
      fetch(URL + '/rest/v1/click_events', {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }

  function insertPhone(payload) {
    return fetch(URL + '/rest/v1/phone_submissions', {
      method: 'POST',
      headers: Object.assign({}, HEADERS, { 'Prefer': 'resolution=ignore-duplicates,return=minimal' }),
      body: JSON.stringify(payload)
    });
  }

  function fetchPage(table, offset) {
    return fetch(URL + '/rest/v1/' + table + '?select=*&order=created_at.asc', {
      headers: {
        'apikey': KEY,
        'Authorization': 'Bearer ' + KEY,
        'Prefer': 'count=exact',
        'Range-Unit': 'items',
        'Range': offset + '-' + (offset + PAGE_SIZE - 1)
      }
    }).then(function (res) {
      if (!res.ok) return res.text().then(function (t) { throw new Error('HTTP ' + res.status + ': ' + t); });
      var cr = res.headers.get('Content-Range');
      var total = cr ? parseInt(cr.split('/')[1], 10) : null;
      return res.json().then(function (rows) { return { rows: rows, total: total }; });
    });
  }

  function fetchAllPages(table) {
    return fetchPage(table, 0).then(function (first) {
      var all = first.rows;
      var total = first.total || all.length;
      if (all.length >= total) return all;
      var pages = [];
      for (var off = PAGE_SIZE; off < total; off += PAGE_SIZE) {
        pages.push(fetchPage(table, off));
      }
      return Promise.all(pages).then(function (results) {
        results.forEach(function (r) { all = all.concat(r.rows); });
        return all;
      });
    });
  }

  function fetchAll() {
    return fetchAllPages('click_events');
  }

  function fetchAllPhones() {
    return fetchAllPages('phone_submissions');
  }

  return {
    insert: insert,
    insertPhone: insertPhone,
    fetchAll: fetchAll,
    fetchAllPhones: fetchAllPhones
  };
})();
