# design runner lab

Two tools for the @designrunnerlab Instagram:

| Folder | What it is |
| --- | --- |
| `studio/` | **Post Studio**, a carousel generator that renders posts in the house style and exports 1080 × 1350 PNGs. |
| `site/` | **The lab**, the link-in-bio website. Each note expands a post and offers a free and an extended template through Gumroad. |
| `assets/` | Brand source files: hand-drawn SVG marks, animated runner and rose, and the HV Smegs fonts. |

Both are plain HTML with no build step. Open `studio/index.html` straight from disk. Serve `site/` from any static host (Vercel, Netlify, GitHub Pages, Cloudflare Pages).

---

## The system, decoded from the feed

### Colour follows purpose

| Colour | Hex | Used for |
| --- | --- | --- |
| Blue | `#2b14cc` | Learning and showcasing **outside** content: courses, tools, other people's work. |
| Red | `#c42112` | Podcasts and entertainment. |
| Cream | `#e0ddd0` | Your own perspective. Ends on "link in bio" to the lab. |
| Charcoal | `#222222` | Giveaways. Ends on "Grab it in the lab (link in bio)." |

Text is cream `#ece8de` on red, blue and charcoal, and near-black `#1b1b1b` on cream. In the studio, set a carousel's **Purpose** and the colour follows. If you pick a colour that breaks the rule, the studio warns you.

### Type

- **Instrument Sans** for everything typeset. Headlines are regular weight with tight tracking (about −4%) and a line height of about 1.0. Labels such as "The Input:" are semibold.
- **HV Smegs** (Style 1 and 2) for the hand-drawn layer: kaomoji glyphs and small annotations.

### Layout (1080 × 1350, 4:5)

- 72 px margins. Everything is left-aligned unless it is the only element on the slide.
- Mark (glyph, logo or LAB) goes top left. The headline sits on the bottom edge with the subhead under it.
- Breakdown slides stack bold-label points at the top, with a large glyph anchoring the bottom.
- Outro: LAB mark, a small aside, then the CTA with an underlined link.

### A carousel is four beats

1. **Cover.** Glyph or intro line, big headline, subhead.
2. **Breakdown.** Two or three `**Label:**` points, or Old way / New way.
3. **Texture, photo or screenshot.** A breather with glitch waves, silk folds, light stretch, a photo with a credit line, or a product screenshot.
4. **Outro / Save.** The LAB mark with the CTA, or "Save it for later" with the bookmark.

---

## Post Studio (`studio/index.html`)

- Eight starter carousels rebuilt from the published posts. Use **+ New carousel** for a recipe per purpose.
- Templates: Cover, Breakdown, Photo, Texture, Outro, Glyph, Showcase, Save.
- Text markup: `**bold**`, `~~strike~~`, `[underlined link]`. A blank line separates points.
- Glyphs: `q(*_*)p` and `(= =)` use the hand-drawn SVGs. Any other kaomoji is set in HV Smegs and roughened. HV Smegs has no glyphs for `- _ < > / \ = ~`, so those characters come from a brush fallback.
- Textures are generated per theme with a seed: **Glitch waves**, **Silk folds** or **Light stretch**. You can also upload your own background.
- **Feed** view shows the profile grid (3:4 crops).
- **Export slide / Export carousel** produce PNGs. Work is saved in your browser's localStorage.

## The lab website (`site/index.html`)

Configure everything at the top of the script:

- `PRODUCTS`: name, prices, item lists and **Gumroad URLs** for the free and extended versions. The URLs and prices in the file are placeholders. Replace them with your real Gumroad product links.
- `NOTES`: one entry per post: slug, colour (cream or charcoal), intro, title, body, and which product it sells.

Link a post to its note with the slug, e.g. `https://your-domain.com/#morning-digest`.

**Gumroad setup.** Create two products per template: the free one priced `$0+` (pay what you want) and the extended one at a fixed price. Alternatively, use one product with two versions. Then paste both links into `PRODUCTS`.
