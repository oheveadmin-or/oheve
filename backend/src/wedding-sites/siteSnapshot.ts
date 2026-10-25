import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import puppeteer, { type Browser } from 'puppeteer-core';

/**
 * Capture d'écran du VRAI site des mariés, utilisée comme image d'aperçu de
 * lien (WhatsApp, iMessage…) : l'invité voit le haut du site tel qu'il est
 * (monogramme, prénoms, motif, couleurs), pas une carte générique.
 *
 * Chromium headless (installé sur Railway via nixpacks.toml) ouvre la page
 * publique en 1200×630, le format des aperçus. Une capture par version du
 * site (updated_at) : en mémoire + sur disque. Si Chromium est absent ou que
 * la capture échoue, l'appelant retombe sur la carte générée.
 */

const W = 1200;
const H = 630;
const SITE_BASE = (process.env.SITE_SNAPSHOT_BASE_URL || 'https://oheve.pages.dev').replace(/\/+$/, '');
const CACHE_DIR = path.join(process.cwd(), 'uploads', 'og-snapshots');
// Change ce préfixe pour invalider toutes les captures déjà en cache.
const CACHE_PREFIX = 'v2';

/**
 * Sur Railway, le Chromium de nix ne trouve aucune configuration fontconfig :
 * il ne dessinait AUCUN texte (capture sans prénoms ni date). On lui fournit
 * une config explicite : polices embarquées du projet + polices système / nix
 * présentes sur la machine.
 */
function fontconfigFile(): string | null {
  try {
    const dirs = [
      path.resolve(__dirname, '../../assets/fonts'),
      '/root/.nix-profile/share/fonts',
      '/nix/var/nix/profiles/default/share/fonts',
      '/usr/share/fonts',
      '/usr/local/share/fonts',
    ].filter((d) => fs.existsSync(d));
    const dir = path.join(os.tmpdir(), 'oheve-fontconfig');
    fs.mkdirSync(path.join(dir, 'cache'), { recursive: true });
    const file = path.join(dir, 'fonts.conf');
    fs.writeFileSync(
      file,
      '<?xml version="1.0"?>\n<!DOCTYPE fontconfig SYSTEM "fonts.dtd">\n<fontconfig>\n' +
        dirs.map((d) => `  <dir>${d}</dir>\n`).join('') +
        `  <cachedir>${path.join(dir, 'cache')}</cachedir>\n</fontconfig>\n`,
    );
    return file;
  } catch {
    return null;
  }
}

function findChromium(): string | null {
  const env = process.env.CHROMIUM_PATH?.trim();
  if (env && fs.existsSync(env)) return env;
  for (const bin of ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable']) {
    try {
      const p = execFileSync('which', [bin], { encoding: 'utf8' }).trim();
      if (p) return p;
    } catch { /* absent */ }
  }
  const mac = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  return fs.existsSync(mac) ? mac : null;
}

let browserPromise: Promise<Browser> | null = null;
let idleTimer: NodeJS.Timeout | null = null;

// Chromium fermé après 2 min sans capture : pas de mémoire occupée en continu.
function scheduleBrowserClose() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    const p = browserPromise;
    browserPromise = null;
    p?.then((b) => b.close()).catch(() => undefined);
  }, 120_000);
}

function getBrowser(): Promise<Browser> {
  if (idleTimer) clearTimeout(idleTimer);
  if (!browserPromise) {
    const executablePath = findChromium();
    if (!executablePath) return Promise.reject(new Error('Chromium introuvable'));
    const fontsConf = process.platform === 'linux' ? fontconfigFile() : null;
    browserPromise = puppeteer
      .launch({
        executablePath,
        headless: true,
        env: fontsConf ? { ...process.env, FONTCONFIG_FILE: fontsConf } : process.env,
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--hide-scrollbars', '--mute-audio'],
      })
      .then((b) => {
        b.on('disconnected', () => { browserPromise = null; });
        return b;
      })
      .catch((err) => { browserPromise = null; throw err; });
  }
  return browserPromise;
}

// Une seule capture à la fois : Chromium est gourmand en mémoire sur Railway.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.catch(() => undefined);
  return run;
}

async function capture(slug: string, key: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
    // Consentement polices déjà donné → polices du thème chargées et pas de
    // bandeau cookies sur la capture.
    await page.evaluateOnNewDocument(
      "try { localStorage.setItem('oheve_cookie_consent', 'accepted'); } catch (e) {}",
    );
    const url = `${SITE_BASE}/wedding/${encodeURIComponent(slug)}?k=${encodeURIComponent(key)}`;
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });
    await page.evaluate('document.fonts && document.fonts.ready');
    // Laisse finir les animations d'entrée du haut de page
    await new Promise((r) => setTimeout(r, 1800));
    // Garde-fou : si Chromium ne dessine pas le texte (polices introuvables),
    // les prénoms ont une largeur nulle → on rejette la capture et l'appelant
    // sert la carte de secours au lieu d'une image vide.
    const textWidth = await page.evaluate(`(() => {
      const el = document.createElement('span');
      el.textContent = 'Mariage';
      el.style.cssText = 'position:absolute;visibility:hidden;font-size:40px;font-family:serif';
      document.body.appendChild(el);
      const w = el.getBoundingClientRect().width;
      el.remove();
      return w;
    })()`) as number;
    if (!(textWidth > 20)) throw new Error(`texte non rendu (largeur ${textWidth})`);
    const shot = await page.screenshot({ type: 'jpeg', quality: 85, clip: { x: 0, y: 0, width: W, height: H } });
    return Buffer.from(shot);
  } finally {
    await page.close().catch(() => undefined);
    scheduleBrowserClose();
  }
}

const memory = new Map<string, Buffer>();
const inflight = new Map<string, Promise<Buffer | null>>();
const MEMORY_MAX = 40;

/**
 * Capture du site pour cette version (`version` = updated_at), ou null si
 * impossible. Les appels concurrents pour la même version partagent le même
 * rendu.
 */
export function getSiteSnapshot(siteId: number, version: string, slug: string, key: string): Promise<Buffer | null> {
  const id = `${CACHE_PREFIX}-${siteId}-${version}`;
  const hit = memory.get(id);
  if (hit) return Promise.resolve(hit);
  const pending = inflight.get(id);
  if (pending) return pending;

  const file = path.join(CACHE_DIR, `${id}.jpg`);
  const job = (async () => {
    try {
      if (fs.existsSync(file)) return fs.readFileSync(file);
      const img = await serial(() => capture(slug, key));
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      fs.writeFileSync(file, img);
      return img;
    } catch (err) {
      console.error('siteSnapshot:', (err as Error).message);
      return null;
    }
  })().then((img) => {
    inflight.delete(id);
    if (img) {
      if (memory.size >= MEMORY_MAX) memory.delete(memory.keys().next().value as string);
      memory.set(id, img);
    }
    return img;
  });
  inflight.set(id, job);
  return job;
}
