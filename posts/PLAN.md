# Posting plan, from 25 Oct 2026

Three posts a week on the lab's Instagram, in the channel's own slots: Tuesday 19:24, Wednesday 18:43, Thursday 10:31 (Madrid time). Posts already placed in Buffer keep their times.

**The new format.** Every carousel made in the studio now goes out as video, following the ramp in the README: each post raises `motion` by 0.1. AUX vs UX runs at 0.2 today, so the next studio post is 0.3, then 0.4, and so on until 1. Carousels that came out of Figma (`images` instead of `slides`) can't animate and stay still.

The `date` and `motion` fields in each `posts/*.json` carry this plan, so the files are the source of truth.

## Calendar

| When | Post | Format | Buffer |
| --- | --- | --- | --- |
| Sun 25 Oct 18:00 | AUX vs UX | video, 0.2 | scheduled, `6adde11c6887a2efc1fef913` |
| Tue 27 Oct 18:00 | Sharpen your thinking | re-render at 0.3 | scheduled with stills, `6ad334a7769b4579346be286` |
| Wed 28 Oct 18:43 | Why do most posts fail? | video, 0.4 | not in Buffer yet |
| Thu 29 Oct 10:31 | How to audit AI-generated UI | 5 new stills now; 0.5 if re-rendered in time | scheduled, `6ad3371a8576172fd0ad846a` |
| Tue 3 Nov 19:24 | MCP, explained for designers | Figma stills | scheduled, `6ad334ab0b0d72757acb5094` |
| Wed 4 Nov 18:43 | The AI product designer shift | video, 0.6 | not in Buffer yet |
| Thu 5 Nov 10:31 | Stop handing off, start shipping | re-render at 0.7 | scheduled with stills, `6ad337417c2a8322499295e5` |
| Tue 10 Nov 19:24 | New tools you should try | Figma stills | scheduled, `6ad33390ae173d6e00aaba6d` |
| Wed 11 Nov 18:43 | Dive Club | video, 0.8 | not in Buffer yet |
| Thu 12 Nov 10:31 | First thing in the morning | video, 0.9 | not in Buffer yet |
| Tue 17 Nov 19:24 | Dessn | Figma stills | not in Buffer yet |
| Wed 18 Nov 18:43 | Grok Bot | Figma stills | not in Buffer yet |
| Thu 19 Nov 10:31 | open | the next studio post runs at 1.0 | |

Already out: How this feed gets made (17 Oct), Free AI courses (21 Oct), Podcasts worth your commute (22 Oct), Your design system is now a prompt (24 Oct). The "How this feed gets made" draft in Buffer stays a draft.

## Each week

1. Render what's due: `SITE_URL=https://designrunnerlab.vercel.app node tools/render-posts.js posts/<name>.json` (about 40 seconds per animated slide, needs ffmpeg).
2. Merge and deploy `site/`, so the MP4s have public URLs. Buffer fetches them at scheduling time, not at posting time.
3. Push to Buffer:
   - new post, at its planned time: `node tools/push-to-buffer.js <name> --at 2026-10-28T18:43:00+01:00`
   - post already in Buffer: `node tools/push-to-buffer.js <name> --update <post id>` keeps the slot and swaps the slides and caption.
   - `--dry-run` first if in doubt.

Keep the week's post dates in the JSON in step with Buffer: Buffer is what posts, the JSON is what the site and the renderer read.

## Loose ends

- Slides that use the Screen or Glyph templates get generic alt text ("Screen slide", "Glyph slide"). Worth a real line each in `tools/render-posts.js` or the studio before the audit post goes out.
- Instagram re-encodes video; check the first video post for banding on the dark backgrounds before raising motion further.
