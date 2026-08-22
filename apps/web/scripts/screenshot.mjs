// Capture the running app to a PNG.
//
// Development happens in environments with no screen — containers, CI, an SSH
// session — where the only way to see what a change did to a diagram is to have
// a browser look for you. Starts a dev server if one isn't already up, shoots
// the page, and stops the server it started.
//
//   node scripts/screenshot.mjs [--out FILE] [--url URL] [--width N] [--height N]

import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const flag = (name, fallback) => {
    const at = args.indexOf(`--${name}`);
    return at === -1 ? fallback : args[at + 1];
};

const url = flag('url', `http://localhost:${process.env.PORT ?? 5173}`);
const out = resolve(webRoot, flag('out', 'screenshots/app.png'));
const width = Number(flag('width', 1280));
const height = Number(flag('height', 900));

const isUp = async () => {
    try {
        await fetch(url, { signal: AbortSignal.timeout(1000) });
        return true;
    } catch {
        return false;
    }
};

/** Starts `npm run dev` and resolves once it serves, or rejects if it never does. */
async function startDevServer() {
    const port = new URL(url).port || '5173';
    const server = spawn('npm', ['run', 'dev', '--', '--port', port, '--strictPort'], {
        cwd: webRoot,
        stdio: 'ignore',
        // Vite spawns through npm, so signal the whole group or the child outlives us.
        detached: true
    });
    server.unref();

    for (let attempt = 0; attempt < 60; attempt++) {
        if (await isUp()) return () => process.kill(-server.pid, 'SIGTERM');
        await new Promise((done) => setTimeout(done, 500));
    }
    process.kill(-server.pid, 'SIGTERM');
    throw new Error(`Dev server did not come up at ${url}`);
}

const alreadyRunning = await isUp();
const stopServer = alreadyRunning ? () => {} : await startDevServer();
if (alreadyRunning) console.log(`Using the dev server already at ${url}`);

const browser = await chromium.launch();
try {
    const page = await browser.newPage({ viewport: { width, height } });

    const problems = [];
    page.on('console', (message) => message.type() === 'error' && problems.push(message.text()));
    page.on('pageerror', (error) => problems.push(String(error)));

    await page.goto(url, { waitUntil: 'networkidle' });
    // The card renders before the engine mounts into it; wait for the drawing.
    await page.locator('.kg-container svg').first().waitFor({ timeout: 15_000 });

    await mkdir(dirname(out), { recursive: true });
    await page.screenshot({ path: out, fullPage: true });
    console.log(`Wrote ${out}`);

    // Worth saying out loud: a diagram that failed to mount still screenshots.
    if (problems.length) {
        console.warn(`\nThe page reported ${problems.length} error(s):`);
        for (const problem of problems) console.warn(`  ${problem}`);
    }
} finally {
    await browser.close();
    stopServer();
}
