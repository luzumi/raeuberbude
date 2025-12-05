// Global test setup
beforeAll(() => {
  console.log('🧪 Starting integration tests...');
});

afterAll(() => {
  console.log('✅ Integration tests completed');
});

// Increase timeout for integration tests when running under jest
;(globalThis as any).jest?.setTimeout(60000);
