// ...existing code...
export function resolveBackendBase(envBackend?: string): string {
  let base = envBackend || '';
  try {
    if (typeof window !== 'undefined' && base) {
      const parsed = new URL(base);
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        parsed.hostname = window.location.hostname;
        base = parsed.origin;
      }
    }
  } catch (e) {
    // ignore and fallback to provided value
  }
  return base.replace(/\/$/, '');
}
// ...existing code...

