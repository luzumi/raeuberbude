// Global test setup
beforeAll(() => {
  console.log('🧪 Starting integration tests...');
});

afterAll(() => {
  console.log('✅ Integration tests completed');
});

// Increase timeout for integration tests
jest.setTimeout(60000);

