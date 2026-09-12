import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  duration: '30s',
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3002';

export default function main() {
  const res = http.get(`${BASE_URL}/health`);
  check(res, { 'health is 200': (r) => r.status === 200 });
  sleep(1);
}
