#!/usr/bin/env node
/*
 * Push a rendered carousel to Buffer without Claude in the loop.
 *
 *   BUFFER_DRL_API_KEY=... node tools/push-to-buffer.js <slug>              # add to the channel's queue
 *   BUFFER_DRL_API_KEY=... node tools/push-to-buffer.js <slug> --draft      # save as a draft
 *   BUFFER_DRL_API_KEY=... node tools/push-to-buffer.js <slug> --now        # publish right away
 *   BUFFER_DRL_API_KEY=... node tools/push-to-buffer.js <slug> --at 2026-11-03T18:00:00+01:00
 *   node tools/push-to-buffer.js <slug> --dry-run                           # print the payload, send nothing
 *
 * It reads site/p/<slug>/buffer.json (written by tools/render-posts.js), finds the
 * Instagram channel on the Buffer account the key belongs to, and creates one post:
 * a carousel when there is more than one slide, a single image or a reel otherwise.
 *
 * The key comes from the environment, never from a file in this repo. Make it at
 * https://publish.buffer.com/settings/api on the Design Runner Lab Buffer account
 * (not the account the Claude connector is signed into).
 *
 * Options:
 *   --channel <id|service|name>   pick a channel when the account has more than one
 *   --list-channels               print the channels the key can see, then exit
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const API = "https://api.buffer.com";
const KEY = process.env.BUFFER_DRL_API_KEY || process.env.BUFFER_API_KEY || "";

function parseArgs(argv) {
  const o = { slug: "", mode: "addToQueue", draft: false, dueAt: "", channel: "", dryRun: false, listChannels: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--draft") o.draft = true;
    else if (a === "--now") o.mode = "shareNow";
    else if (a === "--next") o.mode = "shareNext";
    else if (a === "--at") { o.mode = "customScheduled"; o.dueAt = argv[++i] || ""; }
    else if (a === "--channel") o.channel = argv[++i] || "";
    else if (a === "--dry-run") o.dryRun = true;
    else if (a === "--list-channels") o.listChannels = true;
    else if (a.startsWith("--")) die(`Unknown option ${a}`);
    else o.slug = a.replace(/^posts\//, "").replace(/^site\/p\//, "").replace(/\.json$/, "").replace(/\/$/, "");
  }
  return o;
}

function die(msg) { console.error(msg); process.exit(1); }

async function gql(query, variables) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch (e) { die(`Buffer answered ${res.status} with something that isn't JSON:\n${text.slice(0, 500)}`); }
  if (res.status === 401) die("Buffer rejected the key (401). Check BUFFER_DRL_API_KEY and that it belongs to the right account.");
  if (body.errors && body.errors.length) die("Buffer returned errors:\n" + body.errors.map(e => "  " + e.message).join("\n"));
  return body.data;
}

/* channels(input: {organizationId}) is per organization, so two round trips:
   account -> organizations, then channels for each. */
async function loadChannels() {
  const acct = await gql(`query DrlAccount { account { email organizations { id name } } }`);
  const out = [];
  for (const org of acct.account.organizations) {
    const d = await gql(
      `query DrlChannels($orgId: OrganizationId!) {
         channels(input: { organizationId: $orgId }) { id name displayName service type isDisconnected isLocked }
       }`, { orgId: org.id });
    for (const ch of d.channels) out.push({ ...ch, organizationId: org.id, organizationName: org.name });
  }
  return { email: acct.account.email, channels: out };
}

function pickChannel(channels, want) {
  const usable = channels.filter(c => !c.isDisconnected && !c.isLocked);
  if (want) {
    const w = want.toLowerCase();
    const hit = usable.find(c => c.id === want || c.service === w || (c.name || "").toLowerCase() === w || (c.displayName || "").toLowerCase() === w);
    if (!hit) die(`No connected channel matches "${want}". Run with --list-channels to see them.`);
    return hit;
  }
  const ig = usable.filter(c => c.service === "instagram");
  if (ig.length === 1) return ig[0];
  if (ig.length === 0) die("The key's account has no connected Instagram channel. Pass --channel to use another one.");
  die("More than one Instagram channel on this account. Pass --channel <id or name>:\n" + ig.map(c => `  ${c.id}  ${c.displayName || c.name}`).join("\n"));
}

function buildInput(buffer, channel, opts) {
  const media = buffer.media || [];
  if (!media.length) die(`${buffer.slug}: buffer.json has no media. Render it first.`);
  const bad = media.find(m => !m.url || m.url.includes("YOUR-SITE"));
  if (bad) die(`${buffer.slug}: media URLs are placeholders (${bad.url}). Re-render with SITE_URL set to the deployed site.`);

  /* Buffer refuses a thumbnailUrl on videos (networks never accept one); the
     first frame is the thumbnail, which is what buffer.json's .jpg already shows. */
  const assets = media.map(m => m.type === "video"
    ? { video: { url: m.url, metadata: { thumbnailOffset: 0 } } }
    : { image: { url: m.url, metadata: { altText: m.alt || "" } } });

  /* Instagram's valid types are post, story and reel. A carousel is a "post"
     with several assets; a single video is a reel. */
  const type = media.length === 1 && media[0].type === "video" ? "reel" : "post";
  const input = {
    channelId: channel.id,
    text: buffer.caption || "",
    assets,
    mode: opts.mode,
    schedulingType: "automatic",
    source: "designrunnerlab/tools/push-to-buffer.js",
  };
  if (opts.draft) input.saveToDraft = true;
  if (opts.dueAt) input.dueAt = opts.dueAt;
  if (channel.service === "instagram") input.metadata = { instagram: { type, shouldShareToFeed: true } };
  return input;
}

const CREATE_POST = `
  mutation DrlCreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      __typename
      ... on PostActionSuccess { post { id status dueAt shareMode channel { displayName service } } }
      ... on MutationError { message }
    }
  }`;

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.listChannels) {
    if (!KEY) die("Set BUFFER_DRL_API_KEY first.");
    const { email, channels } = await loadChannels();
    console.log(`Buffer account: ${email}`);
    for (const c of channels) console.log(`  ${c.id}  ${c.service.padEnd(10)} ${c.displayName || c.name}${c.isDisconnected ? "  (disconnected)" : ""}  [${c.organizationName}]`);
    return;
  }

  if (!opts.slug) die("Usage: node tools/push-to-buffer.js <slug> [--draft | --now | --next | --at <ISO time>] [--channel <id|service|name>] [--dry-run]");
  if (opts.mode === "customScheduled" && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(opts.dueAt)) die("--at needs an ISO time with offset, like 2026-11-03T18:00:00+01:00");

  const file = path.join(ROOT, "site", "p", opts.slug, "buffer.json");
  if (!fs.existsSync(file)) die(`${file} doesn't exist. Render posts/${opts.slug}.json first.`);
  const buffer = JSON.parse(fs.readFileSync(file, "utf8"));

  if (opts.dryRun) {
    const channel = { id: "<channel id>", service: opts.channel || "instagram", displayName: "<channel>" };
    console.log(JSON.stringify({ query: CREATE_POST.trim(), variables: { input: buildInput(buffer, channel, opts) } }, null, 2));
    return;
  }

  if (!KEY) die("Set BUFFER_DRL_API_KEY (the key from the Design Runner Lab Buffer account). Nothing was sent.");
  const { email, channels } = await loadChannels();
  const channel = pickChannel(channels, opts.channel);
  const input = buildInput(buffer, channel, opts);

  const d = await gql(CREATE_POST, { input });
  const r = d.createPost;
  if (r.__typename !== "PostActionSuccess") die(`Buffer refused the post (${r.__typename}): ${r.message}`);
  const p = r.post;
  const when = p.dueAt ? ` for ${p.dueAt}` : "";
  const kind = (buffer.media || []).length > 1 ? "carousel" : input.metadata ? input.metadata.instagram.type : "post";
  console.log(`✓ ${buffer.slug}: ${kind} ${p.status}${when} on ${p.channel.displayName} (${p.channel.service}) as ${email}`);
  console.log(`  post ${p.id} · ${media(buffer)}`);
}

function media(buffer) {
  const m = buffer.media || [];
  return `${m.length} ${m[0] && m[0].type === "video" ? "video" : "image"} slide${m.length === 1 ? "" : "s"}`;
}

main().catch(err => { console.error(err.message || err); process.exit(1); });
