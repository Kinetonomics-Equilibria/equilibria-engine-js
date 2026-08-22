// These packages ship no PostCSS-processed styles. This file exists only to
// stop PostCSS's config search — run by Vitest via Vite — from walking up out
// of the repo and picking up an unrelated config in a parent directory.
// Mantine's PostCSS setup lives in apps/web, where Mantine is installed.
export default { plugins: {} };
