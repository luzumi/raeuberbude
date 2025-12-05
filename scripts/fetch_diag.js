(async () => {
  const fetch = globalThis.fetch || (await import('node-fetch')).default;
  const url = process.env.BASE_URL || 'http://127.0.0.1:3010/api/diag/metrics';
  try {
    const res = await fetch(url, { timeout: 5000 });
    const text = await res.text();
    console.log('STATUS', res.status);
    console.log(text);
  } catch (e) {
    console.error('FETCH_ERR', e && e.message ? e.message : e);
  }
})();

