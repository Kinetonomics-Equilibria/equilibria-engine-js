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
    projects: [{
        name: 'chromium',
        use: {
            ...devices['Desktop Chrome'],
            // Larger than the device default's 1280x720, and the reason is a
            // measurement rather than a preference. At 1280x720 the focal panel
            // came out 424px across — four pixels above P4's 420px `compact`
            // threshold — so "the focal panel is drawn in full" was true by a
            // margin of four pixels, and P10's track row under the stage was
            // enough to cross it. The claims this suite makes about density are
            // claims about a screen with room on it; this is a screen with room
            // on it. The compact behaviour at a smaller viewport is the design
            // working, not a regression.
            viewport: { width: 1440, height: 900 }
        }
    }],
    webServer: {
        command: `npm run dev -- --port ${port} --strictPort`,
        url: baseURL,
        // Attach to the `npm run dev` you already have open rather than fighting
        // it for the port; CI has none, so it starts its own and tears it down.
        reuseExistingServer: !process.env.CI,
        timeout: 120_000
    }
});
