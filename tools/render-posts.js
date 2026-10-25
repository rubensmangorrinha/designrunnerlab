#!/usr/bin/env node
/*
 * Render carousels for Buffer.
 *
 *   node tools/render-posts.js                 # every posts/*.json
 *   node tools/render-posts.js posts/foo.json  # just one
 *
 * For each carousel it opens Post Studio in headless Chromium, renders every
 * slide at 1080 x 1350, and writes:
 *
 *   site/p/<slug>/01.png, 02.png, ...   the slides (deployed with the site, so
 *                                        each one gets a public URL)
 *   site/p/<slug>/buffer.json           caption + image URLs + alt text, ready
 *                                        for Buffer's create_post
 *
 * Set SITE_URL to where site/ is deployed so the URLs in buffer.json are real:
 *   SITE_URL=https://designrunnerlab.com node tools/render-posts.js
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const SITE_URL = (process.env.SITE_URL || "https://YOUR-SITE").replace(/\/$/, "");
const slugify = s => String(s || "post").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "post";

async function main() {
  const args = process.argv.slice(2);
  const files = args.length
    ? args.map(f => path.resolve(f))
    : fs.readdirSync(path.join(ROOT, "posts")).filter(f => f.endsWith(".json")).map(f => path.join(ROOT, "posts", f));
  if (!files.length) { console.log("No posts/*.json found."); return; }

  const launch = process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {};
  const browser = await chromium.launch(launch);
  const page = await browser.newPage();
  page.on("pageerror", e => console.error("  studio error:", e.message));
  await page.goto("file://" + path.join(ROOT, "studio", "index.html"));
  await page.waitForFunction(() => window.PostStudio);

  for (const file of files) {
    const json = JSON.parse(fs.readFileSync(file, "utf8"));
    const slug = json.slug || slugify(path.basename(file, ".json"));
    const outDir = path.join(ROOT, "site", "p", slug);
    fs.mkdirSync(outDir, { recursive: true });
    for (const f of fs.readdirSync(outDir)) if (f.endsWith(".png")) fs.unlinkSync(path.join(outDir, f));

    const slides = await page.evaluate(j => window.PostStudio.render(j), json);
    const images = slides.map(s => {
      const name = String(s.n).padStart(2, "0") + ".png";
      fs.writeFileSync(path.join(outDir, name), Buffer.from(s.png.split(",")[1], "base64"));
      return { file: `p/${slug}/${name}`, url: `${SITE_URL}/p/${slug}/${name}`, alt: s.alt };
    });
    const buffer = { slug, name: json.name, purpose: json.purpose, caption: json.caption || "", images };
    fs.writeFileSync(path.join(outDir, "buffer.json"), JSON.stringify(buffer, null, 2) + "\n");
    console.log(`✓ ${slug}: ${images.length} slides -> site/p/${slug}/`);
  }
  await browser.close();
  if (SITE_URL.includes("YOUR-SITE")) console.log("\nSet SITE_URL to your deployed site so buffer.json has real image URLs.");
}

main().catch(err => { console.error(err); process.exit(1); });
