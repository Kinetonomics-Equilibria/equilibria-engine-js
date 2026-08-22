import { defineConfig, devices } from '@playwright/test';

// The port the app is normally developed on. Overridable so a run can dodge a
// dev server you already have on 5173 with something else in it.
const port = Number(process.env.PORT ?? 5173);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
    testDir: './tests',
    // One dev server and a handful of checks: running them serially keeps the
    // output in order and the server single-tenant, and costs nothing at this
    // size. Parallelise when the suite is big enough to feel slow.
    fullyParallel: false,
    workers: 1,
    forbidOnly: !!process.env.CI,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
    use: {
        baseURL,
        // A failed run should leave behind enough to see what the browser saw,
        // which matters most in a headless container where you cannot look.
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure'
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: {
        command: `npm run dev -- --port ${port} --strictPort`,
        url: baseURL,
        // Attach to the `npm run dev` you already have open rather than fighting
        // it for the port; CI has none, so it starts its own and tears it down.
        reuseExistingServer: !process.env.CI,
        timeout: 120_000
    }
});
