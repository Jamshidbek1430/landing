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

  // Data retrieval from the new backend
  function fetchAll() {
    return fetch(API_URL.replace('/insert', '/clicks'))
      .then(res => res.json());
  }

  function fetchAllPhones() {
    return fetch(API_URL.replace('/insert', '/phones'))
      .then(res => res.json());
  }

  return {
    insert: insert,
    insertPhone: insertPhone,
    fetchAll: fetchAll,
    fetchAllPhones: fetchAllPhones
  };
})();
