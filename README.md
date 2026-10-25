# design runner lab

| Folder | What it is |
| --- | --- |
| `studio/` | **Post Studio**: the Instagram template generator. Builds carousels in the house style and exports 1080 × 1350 PNGs and carousel JSON. |
| `posts/` | One JSON file per carousel. This is the source the Buffer pipeline renders from. |
| `site/` | **The lab**: the link-in-bio website (Links, Read, About), plus `site/p/`, the rendered slides that Buffer pulls from. |
| `experiments/` | `glyph-pit.html`, the standalone single-file version of the physics header. |
| `tools/` | `render-posts.js` (posts → PNGs + Buffer payload) and `build-site.py` (inlines brand SVGs, builds the experiment). |
| `assets/` | Brand sources: hand-drawn SVG marks, animated runner and rose, and the HV Smegs fonts. |

---

## From idea to Buffer

1. **Make the carousel** in `studio/index.html`: pick a recipe or start blank, then edit.
2. **Export JSON** (Carousel section in the inspector), and save it as `posts/<name>.json`.
   Claude can also write these files directly; the format is below.
3. **Render**: `SITE_URL=https://your-site.com node tools/render-posts.js`
   This writes `site/p/<name>/01.png … NN.png` and `site/p/<name>/buffer.json`, which holds the caption, the image URLs and per-slide alt text.
4. **Deploy `site/`**. The slides now have public URLs, which is what Buffer needs for Instagram.
5. **Schedule.** Ask Claude to "schedule posts/<name> to Buffer". It reads `buffer.json` and creates the Instagram carousel post through the Buffer connector (queue, a specific time, or as a draft).
   Without Claude, upload the PNGs in Buffer by hand and paste the caption.

### Carousel JSON

```json
{
  "name": "Why do most posts fail?",
  "purpose": "view",
  "caption": "Instagram caption…",
  "slides": [
    { "template": "cover", "top": "none", "headline": "Your\nContent\nFunnel Is\nLeaking.", "note": "• No clear CTA", "cta": "Find out more →" },
    { "template": "stat", "headline": "Why do most posts fail? →", "number": "91%", "caption": "of posts get zero meaningful engagement." }
  ]
}
```

`purpose` sets the colour (see below). Any slide can override it with `"theme"`. Fields you leave out use the template's defaults. Images can be data URLs (from the studio) or paths and URLs the studio can load.

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

## The lab website (`site/`)

- **Links:** the Gumroad links, edited directly in the HTML.
- **Read:** articles as a list or a grid of cards. Each article opens as its own page (`#<slug>`) and ends with its free and paid links. Edit `ARTICLES` in the script.
- **About:** the about text with the blooming rose.
- **Glyph Pit:** Matter.js physics under the content, in space nobody reads. Move the cursor to push glyphs, drag to throw them, click to spawn new ones, and scroll to shake the pile. Matter.js is vendored in `site/vendor/`.

After editing the SVGs in `assets/`, run `python3 tools/build-site.py`.

The prices and most Gumroad slugs in the site are placeholders. The only real link is `mangorrinha.gumroad.com/l/Designcompanion`.
