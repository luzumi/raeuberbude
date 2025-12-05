import http from 'k6/http';

export default function () {
  const res = http.get(__ENV.BASE_URL || 'http://localhost:3002/health');
  if (res.status !== 200) {
    console.log('health status', res.status);
  }
}

