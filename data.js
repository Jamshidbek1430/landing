var DB = (function () {
  var API_URL = 'https://landing-production-54c5.up.railway.app/api/insert';

  function insert(payload) {
    try {
      fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'click_events', data: payload }),
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }

  function insertPhone(payload) {
    return fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'phone_submissions', data: payload })
    });
  }

  // Note: Data retrieval needs to be handled by your backend for production security
  function fetchAll() { return Promise.resolve([]); }
  function fetchAllPhones() { return Promise.resolve([]); }

  return {
    insert: insert,
    insertPhone: insertPhone,
    fetchAll: fetchAll,
    fetchAllPhones: fetchAllPhones
  };
})();
