# design runner lab

| Folder | What it is |
| --- | --- |
| `studio/` | **Post Studio**: the Instagram template generator. Builds carousels in the house style and exports 1080 × 1350 PNGs and carousel JSON. |
| `posts/` | One JSON file per carousel. This is the source the Buffer pipeline renders from. |
| `site/` | **The lab**: the link-in-bio website (Links, Read, About), plus `site/p/`, the rendered slides that Buffer pulls from. |
| `experiments/` | `glyph-pit.html`: a standalone single-file physics header, built from `glyph-pit.js`. |
| `tools/` | `render-posts.js` (posts → PNGs + Buffer payload) and `build-site.py` (inlines brand SVGs, builds the experiment). |
| `assets/` | Brand sources: hand-drawn SVG marks, animated runner and rose, and the HV Smegs fonts. |

---

## From idea to Buffer

1. **Make the carousel** in `studio/index.html`: pick a recipe or start blank, then edit.
2. **Export JSON** (Carousel section in the inspector), and save it as `posts/<name>.json`.
   Claude can also write these files directly; the format is below.
3. **Render**: `SITE_URL=https://your-site.com node tools/render-posts.js`
   This writes the slides to `site/p/<name>/`: PNGs, or MP4 loops with a JPG thumbnail when `motion` is above 0. It also writes `buffer.json`, which holds the caption, the media URLs and per-slide alt text.
4. **Deploy `site/`**. The slides now have public URLs, which is what Buffer needs for Instagram.
5. **Schedule.** Ask Claude to "schedule posts/<name> to Buffer". It reads `buffer.json` and creates the Instagram carousel post through the Buffer connector (queue, a specific time, or as a draft).
   Without Claude, upload the PNGs in Buffer by hand and paste the caption.

### Motion and the ramp

Every carousel has a `motion` level from `0` to `1`; set it with the Motion slider in the studio. At `0` the slides are still PNGs. Above `0` each slide becomes a 6-second MP4 loop, and every level adds an effect:

| Level | What moves |
| --- | --- |
| 0.1+ | Glyphs, marks and logos breathe |
| 0.3+ | Text lines dip out and rise back in, staggered |
| 0.5+ | Backgrounds drift; giant words slide |
| 0.7+ | Circles draw themselves on; stat numbers count up |

The motion is tuned to about half the website's intensity. Frame 0 is always the finished slide, so the cover frame Instagram shows is never empty.

**The ramp.** Raise the level by 0.1 per post: the next post is `0.1`, then `0.2`, and so on until everything runs at `1`. The render script needs `ffmpeg` for video (`brew install ffmpeg`). Without it, slides stay still. Rendering takes about 40 seconds per animated slide.

### Carousel JSON

```json
{
  "name": "Why do most posts fail?",
  "purpose": "view",
  "motion": 0.1,
  "date": "2026-10-28",
  "caption": "Instagram caption…",
  "slides": [
    { "template": "cover", "top": "none", "headline": "Your\nContent\nFunnel Is\nLeaking.", "note": "• No clear CTA", "cta": "Find out more →" },
    { "template": "stat", "headline": "Why do most posts fail? →", "number": "91%", "caption": "of posts get zero meaningful engagement." }
  ]
}
```

`purpose` sets the colour (see below). Any slide can override it with `"theme"`. Fields you leave out use the template's defaults. Images can be data URLs (from the studio) or paths and URLs the studio can load.

Slides designed in Figma skip the studio. Put the exports in `posts/media/<slug>/` and list them instead of `slides`, with one alt line per slide:

```json
{ "name": "MCP, explained for designers", "purpose": "learn", "date": "2026-11-03", "caption": "…",
  "images": ["posts/media/mcp-explained-for-designers/01.png", "…"],
  "alt": ["MCP, explained for designers. Your AI tools can plug into the rest of your stack.", "…"] }
```

The renderer copies them into `site/p/<slug>/` with the same `thumb.jpg` and `buffer.json`.

---

## The system

### Colour follows purpose

| Purpose | Colour | Used for |
| --- | --- | --- |
| `learn` | Blue `#2b14cc` | Learning and showcasing **outside** content: courses, tools, other people's work. |
| `listen` | Red `#c42112` | Podcasts and entertainment. |
| `view` | Cream `#e0ddd0` / Charcoal | Your own perspective. Ends on "link in bio". |
| `giveaway` | Charcoal `#222222` / Cream | Giveaways. Ends on "Grab it in the lab (link in bio)." |

The studio warns you when a colour breaks the rule.

### Type

- **Instrument Sans** sets everything. Headlines are regular weight, tracked tight (about −4%), with a line height of about 1.0.
- **Instrument Serif italic** for accent words (`_like this_`).
- **IBM Plex Mono**, uppercase, for small labels and notes.
- **HV Smegs** for the hand-drawn glyph layer.

### Templates

| Template | Use |
| --- | --- |
| Classic | Your classic post: small descriptor on top, the big line at the bottom, runner mark small top-right or large above the handle. Optional 1px diagrams in between: eye vs node graph, comparison table, loop of four steps, chain with a wrong step, name and instruction rows. |
| Cover | Glyph, logo or intro line on top; headline on the bottom edge. Options: uppercase, mono note, corner link, arrow pill, silk or stretch background. |
| Breakdown | `**Label:**` points, or Old way / New way. |
| Photo | Framed photo or screenshot with a credit line. |
| Texture | Glitch waves, silk folds or light stretch, generated per theme. |
| Stat | Big accent number with the claim above it. |
| Index | Mono eyebrow, big "01", two mini lists, photo. |
| Bleed | Mono columns over one giant cropped word, with an optional overlapping photo. |
| Card | Photo with a light card and an accent rules card. |
| Centered | Mark on top, a mixed caps and serif statement, two notes. |
| Glyph | A single kaomoji. |
| Showcase | Product name on the band, screenshot below. |
| Outro / Save | LAB mark with the CTA, or "Save it for later" with the bookmark. |

### Text markup

`**bold**` · `_italic serif_` · `~~strike~~` · `[underlined]` · `((circled))` · `{{accent colour}}`. Leave a blank line between points.

---

## Voice

`.claude/skills/my-writing-style/SKILL.md` is Ruben's voice profile. Claude loads it when drafting articles, captions or anything published as him.

## The lab website (`site/`)

- **Links:** grouped by the Instagram post they came from. Each entry shows the post's cover slide, its date and its title, then the Gumroad links and "Read more about it". Edit `LINKS` in `site/index.html`. The cover, title and date come from `site/p/posts.js`, which `tools/render-posts.js` writes from `posts/*.json`. Give every post a `date` (YYYY-MM-DD) so people can match it to what they saw. Only add a Gumroad link when something real is attached; a post without one just gets "Read more about it". A hypnotic looping @ sits beside the heading.
- **Read:** an infinite gallery you drag around. It drifts to a stop when you let go, horizontal trackpad swipes pan it, and the cards are reachable with Tab. Clicking a card scales it into an overlay with close-ups, what's inside, a Free or Extended choice and the Gumroad button. A List view is one click away.
- **Articles (`#<slug>`):** after the title and first paragraph, a flat 2D scene acts out the topic as you scroll, with a little mouse parallax (`site/topic-scene.js`):
  - `agents`: a screen for eyes rearranges into the read, decide, act, check loop.
  - `digest`: six tabs fold into one brief.
  - `architect`: pixels assemble into a grid.
  - `system`: components flatten into written rules.
  - `hub`: tools wired one by one settle onto one shared connection.
  - `graph`: loose notes shrink into dots joined by links.

  Pick one per article with `topic.scene`.
- **About:** the about text with the blooming rose.
- **Footer:** a meadow of blooming roses swaying in the wind. Moving the cursor through them pushes a gust.
- **Runner:** the running logo is the loading screen, and it leaps across a quick wipe on every page change.

Everything respects reduced motion. Edit `ARTICLES` in `site/index.html` to add articles.

After editing the SVGs in `assets/`, run `python3 tools/build-site.py`. It also rebuilds `experiments/glyph-pit.html`, the standalone physics toy, from `experiments/glyph-pit.js`.

The prices and most Gumroad slugs in the site are placeholders. The only real link is `mangorrinha.gumroad.com/l/Designcompanion`.
