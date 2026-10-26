// Ruben's CV, restyled in the design runner lab house style.
// Cream / charcoal ("view": my own perspective), Instrument Sans tracked tight,
// Instrument Serif italic accents, IBM Plex Mono uppercase labels, the runner mark.
const pptxgen = require("pptxgenjs");
const path = require("path");
const { applyTheme } = require(process.env.APPLY_THEME);

const OUT = process.argv[2] || "Ruben-Mangorrinha-CV.pptx";

const THEME = {
  name: "design runner lab",
  headFontFace: "Instrument Sans",
  bodyFontFace: "Instrument Sans",
  colors: {
    dk1: "1E1E1E", lt1: "E1DDD1", dk2: "6F716B", lt2: "FFFFFF",
    accent1: "C31F0D", accent2: "250DC3", accent3: "B1B6B0", accent4: "F0C4BD",
    accent5: "B9B2EE", accent6: "2A2A2D", hlink: "250DC3", folHlink: "6F716B",
  },
};
const CHAR = "1E1E1E", CREAM = "E1DDD1", MUTED = "6F716B", MUTED_D = "B1B6B0", RED = "C31F0D", BLUE = "250DC3";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.author = "Rubén Santana Mangorrinha";
pres.title = "Rubén Santana Mangorrinha, CV";
const C = pres.SchemeColor;

const W = 13.333, H = 7.5, M = 0.6;
const MONO = "IBM Plex Mono", SERIF = "Instrument Serif";
const RUNNER = (c) => path.join(__dirname, "marks", `runner-${c}.png`);
const LAB = (c) => path.join(__dirname, "marks", `lab-${c}.png`);

// Tracking in points: Instrument Sans headlines at about -4%, body at about -1.2%.
const track = (pt, ratio) => Math.round(pt * ratio * 100) / 100;

// ---------- layouts ----------
// Light frame: cream field, charcoal runner small top-right, mono page number.
pres.defineSlideMaster({
  title: "LIGHT", background: { color: CREAM },
  objects: [
    { image: { x: W - M - 0.42, y: M - 0.02, w: 0.42, h: 0.364, path: RUNNER("charcoal") } },
    { placeholder: { options: { name: "eyebrow", type: "body", x: M, y: M - 0.02, w: 8.4, h: 0.3, margin: 0, fontFace: MONO, fontSize: 9.5, color: C.text1, charSpacing: 0.4, valign: "top" }, text: "" } },
  ],
  slideNumber: { x: W - M - 0.9, y: H - M - 0.1, w: 0.9, h: 0.25, fontFace: MONO, fontSize: 8.5, color: MUTED, align: "right", margin: 0 },
});
// Dark frame: charcoal field, cream runner.
pres.defineSlideMaster({
  title: "DARK", background: { color: CHAR },
  objects: [
    { image: { x: W - M - 0.42, y: M - 0.02, w: 0.42, h: 0.364, path: RUNNER("cream") } },
    { placeholder: { options: { name: "eyebrow", type: "body", x: M, y: M - 0.02, w: 8.4, h: 0.3, margin: 0, fontFace: MONO, fontSize: 9.5, color: C.background1, charSpacing: 0.4, valign: "top" }, text: "" } },
  ],
  slideNumber: { x: W - M - 0.9, y: H - M - 0.1, w: 0.9, h: 0.25, fontFace: MONO, fontSize: 8.5, color: MUTED_D, align: "right", margin: 0 },
});

// ---------- helpers ----------
const mono = (slide, text, o) => slide.addText(text.toUpperCase(), {
  isTextBox: true, margin: 0, fontFace: MONO, fontSize: 9.5, charSpacing: 0.4, color: C.text1, valign: "top", ...o,
});
const rule = (slide, x, y, w, color) => slide.addShape(pres.shapes.LINE, { x, y, w, h: 0, line: { color: color || C.text1, width: 0.5 } });

// Headline: regular weight, tight tracking, line height 1.0, sits on its bottom edge.
function headline(slide, runs, { x = M, y, w, h, pt = 54, color = C.text1, align = "left", valign = "bottom" } = {}) {
  const r = (typeof runs === "string") ? [{ text: runs }] : runs;
  slide.addText(r.map(({ text, serif, dim }) => ({
    text,
    options: serif
      ? { fontFace: SERIF, italic: true, fontSize: Math.round(pt * 1.06), charSpacing: track(pt, -0.01), color }
      : { fontFace: THEME.headFontFace, fontSize: pt, charSpacing: track(pt, -0.04), color: dim ? MUTED : color },
  })), { isTextBox: true, x, y, w, h, margin: 0, align, valign, lineSpacingMultiple: 0.96, fit: "none", color });
}

// Body paragraph.
function body(slide, text, { x, y, w, h, pt = 15, color = C.text1, valign = "top", lineSpacingMultiple = 1.18 } = {}) {
  const runs = (typeof text === "string") ? [{ text }] : text;
  slide.addText(runs.map(({ text, serif, bold, muted }) => ({
    text,
    options: serif
      ? { fontFace: SERIF, italic: true, fontSize: Math.round(pt * 1.08), color }
      : { fontFace: THEME.bodyFontFace, fontSize: pt, bold: !!bold, charSpacing: track(pt, -0.012), color: muted ? MUTED : color },
  })), { isTextBox: true, x, y, w, h, margin: 0, valign, lineSpacingMultiple });
}

// Rows separated by hairlines, like the "four things" slide. Each row: { title, text }.
// Returns the y after the last rule.
function rows(slide, items, { x, y, w, pt = 14.5, titlePt = 17, gap = 0.17, color = C.text1, lineColor, dark = false, minRow = 0.0 }) {
  const cpl = Math.floor(w * 72 / (pt * 0.48)); // rough chars per line for Instrument Sans at this width
  let cy = y;
  rule(slide, x, cy, w, lineColor);
  items.forEach((it) => {
    const lines = it.text ? Math.max(1, Math.ceil(it.text.length / cpl)) : 0;
    const th = it.title ? titlePt / 72 * 1.3 : 0;
    const bh = lines * (pt / 72) * 1.38 + (lines ? 0.04 : 0);
    const rowH = Math.max(minRow, th + bh + gap * 2 - 0.02);
    let ty = cy + gap;
    if (it.title) {
      slide.addText([{ text: it.title, options: { fontSize: titlePt, charSpacing: track(titlePt, -0.025), color } },
        ...(it.meta ? [{ text: "  " + it.meta, options: { fontFace: MONO, fontSize: 9, color: dark ? MUTED_D : MUTED } }] : [])],
        { isTextBox: true, x, y: ty, w, h: th, margin: 0, valign: "top" });
      ty += th;
    }
    if (it.text) body(slide, it.text, { x, y: ty, w, h: bh, pt, color });
    cy += rowH;
    rule(slide, x, cy, w, lineColor);
  });
  return cy;
}

// Outlined pill, like the studio chips.
function pill(slide, text, x, y, { color = C.text1, pt = 10 } = {}) {
  const w = text.length * pt * 0.0085 + 0.34;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 0.36, rectRadius: 0.18, fill: { type: "none" }, line: { color, width: 0.75 } });
  slide.addText(text, { isTextBox: true, x, y, w, h: 0.36, margin: 0, align: "center", valign: "middle", fontFace: MONO, fontSize: pt, color, charSpacing: 0.2 });
  return w;
}

// ---------- content ----------
pres.addSection({ title: "Cover" });
{
  const s = pres.addSlide({ masterName: "DARK", sectionTitle: "Cover" });
  s.addText("Curriculum vitae  ·  2026", { placeholder: "eyebrow" });
  mono(s, "Amsterdam, Netherlands", { x: M, y: M + 0.3, w: 6, h: 0.3, color: MUTED_D });
  s.addImage({ path: LAB("cream"), x: W - M - 1.5, y: 1.55, w: 1.5, h: 1.458 });
  headline(s, [{ text: "Rubén Santana\nMangorrinha" }], { y: 1.9, w: W - 2 * M, h: 3.3, pt: 96, color: C.background1 });
  headline(s, [{ text: "Lead Product Designer " }, { text: "Growth, AI & design engineering", serif: true }],
    { y: 5.3, w: W - 2 * M - 0.2, h: 0.75, pt: 30, color: C.background1, valign: "top" });
  mono(s, "rubensantanamangorrinha@gmail.com   ·   +351 916 525 749   ·   linkedin.com/in/rubenmangorrinha   ·   rubenmangorrinha.com",
    { x: M, y: H - M - 0.1, w: 10.8, h: 0.25, color: C.background1, valign: "bottom" });
}

pres.addSection({ title: "Profile" });
{
  const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "Profile" });
  s.addText("Professional summary", { placeholder: "eyebrow" });
  headline(s, [{ text: "14+ years in growth\nand product design.\n" }, { text: "Now shipping the prototypes too.", serif: true }],
    { y: 1.6, w: 6.6, h: 5.0, pt: 48 });
  body(s, [
    { text: "Lead Product Designer with 14+ years building growth and product experiences across SaaS, e-commerce, automotive and enterprise products. Focused on user activation, monetization, identity flows and AI-enabled experiences.\n\n" },
    { text: "Recently working as a design engineer, building and shipping interactive prototypes, deploy pipelines and reusable AI-native tooling.\n\n" },
    { text: "Has led design at Mermaid Chart, PandaDoc and Miro, and delivered programmes for Toyota, BMW and Farfetch." },
  ], { x: 7.75, y: 1.65, w: W - M - 7.75, h: 4.2, pt: 15.5 });
  // Three small facts from the CV, as stat tiles.
  const facts = [["14+", "years in product design"], ["3", "design leads: Mermaid Chart, PandaDoc, Miro"], ["30", "markets served for Toyota Europe"]];
  const fx = 7.75, fw = (W - M - 7.75);
  rule(s, fx, 5.55, fw);
  facts.forEach(([n, l], i) => {
    const x = fx + i * (fw / 3);
    s.addText(n, { isTextBox: true, x, y: 5.68, w: fw / 3 - 0.2, h: 0.55, margin: 0, fontSize: 30, charSpacing: track(30, -0.04), color: RED, valign: "top" });
    mono(s, l, { x, y: 6.28, w: fw / 3 - 0.25, h: 0.5, color: MUTED });
  });
}

pres.addSection({ title: "Skills" });
{
  const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "Skills" });
  s.addText("Core skills & tools", { placeholder: "eyebrow" });
  headline(s, [{ text: "What I " }, { text: "bring", serif: true }, { text: "\nto the table." }], { y: 1.6, w: 4.8, h: 2.4, pt: 48, valign: "top" });
  const skills = [
    { title: "AI-driven user experience" },
    { title: "Design engineering and front-end prototyping", meta: "HTML · CSS · JavaScript" },
    { title: "AI-native tooling and MCP integration; prompt design" },
    { title: "Growth design, activation and monetization, product analytics" },
    { title: "Identity and authentication flows" },
    { title: "Design systems; user research", meta: "Qualitative · quantitative" },
    { title: "Cross-functional leadership" },
  ];
  rows(s, skills, { x: 5.8, y: 1.6, w: W - M - 5.8, titlePt: 16, gap: 0.2 });
  mono(s, "Tools", { x: M, y: 5.45, w: 3, h: 0.25, color: MUTED });
  const tools = ["Figma", "Framer", "Sketch", "HTML / CSS / JS", "GitHub", "Cursor", "Claude", "Mixpanel"];
  let px = M, py = 5.8;
  tools.forEach((t) => {
    const w = t.length * 10 * 0.0085 + 0.34;
    if (px + w > 5.3) { px = M; py += 0.48; }
    pill(s, t, px, py);
    px += w + 0.12;
  });
}

pres.addSection({ title: "Experience" });
const ROLES = [
  { role: "Lead Product Designer,\nGrowth & AI", company: "Mermaid Chart", place: "Remote", dates: "June 2025 – Present", short: "2025 –", points: [
    "Lead product design across AI, dashboard, community and growth, to raise activation and average revenue per new subscription; directly manage a designer covering plugins and integrations.",
    "2026 focus on design engineering: shipping interactive, coded prototypes (HTML, CSS, JavaScript) to live URLs for stakeholder review and usability testing.",
    "Designed “Skills as the New Templates”, an MCP-integrated concept where reusable context bundles shape how AI generates diagrams.",
    "Built a library of reusable internal skills and a GitHub-based concept-to-live-prototype deploy pipeline.",
    "Ground activation, onboarding and pricing decisions in product analytics (Mixpanel); own initiatives end to end and maintain the design system.",
  ] },
  { role: "Staff Product Designer, Growth", company: "PandaDoc", place: "Remote", dates: "December 2024 – June 2025", short: "2024 – 25", points: [
    "Led end-to-end design for a significant part of the product, from concept and prototyping to high-fidelity delivery.",
    "Set design direction and standards for the product area, using design-system best practices.",
    "Designed AI-generated experiences that help users create their first workflow, template and documents.",
    "Championed usability and accessibility; planned and ran qualitative and quantitative research.",
  ] },
  { role: "Digital Design Manager, Growth / Senior Digital Growth Designer", company: "Miro", place: "Amsterdam", dates: "September 2021 – November 2024", short: "2021 – 24", points: [
    "Owned the full user-identity journey: sign-in, sign-up, onboarding, user profile, authentication methods and settings.",
    "Formed hypotheses with product managers, designed solutions, measured success and iterated across growth initiatives.",
    "Researched users and the competitive landscape; partnered with developers on implementation. Helped grow the design team through process and mentorship.",
  ] },
  { role: "Senior Digital Product Designer", company: "AKQA", place: "Amsterdam", dates: "December 2020 – September 2021", short: "2020 – 21", points: [
    "Led design on the customer-care vertical for Toyota Europe across 30 markets, working with four feature development teams.",
    "Translated user problems and data into solutions that met owner needs and business requirements; aligned cross-channel experience with other verticals.",
  ] },
  { role: "Digital Product Designer", company: "Farfetch", place: "Lisbon", dates: "August 2019 – December 2020", short: "2019 – 20", points: [
    "Designed the luxury-fashion e-commerce experience across app and web (inspiration; acquisition & engagement).",
    "Facilitated a user-segmentation governance workshop with 30+ participants; led the global iOS homepage component redesign.",
    "Iterated UI through user testing and introduced proactive feedback systems.",
  ] },
  { role: "UX Designer (BMW Group)", company: "Critical TechWorks", place: "Lisbon", dates: "December 2018 – August 2019", short: "2018 – 19", points: [
    "Improved the innovation and funding process for the BMW innovation centre, which evaluates around 1,000 ideas a year.",
    "Led collaboration with BMW's Munich innovation lab on B2B internal tools; ran design sprints and MVP launches within five months that improved 80% of the funding process.",
    "Conducted field interviews and user testing; mentored 11 designers on the tooling-UI process.",
  ] },
];

// Experience overview: a timeline on charcoal.
{
  const s = pres.addSlide({ masterName: "DARK", sectionTitle: "Experience" });
  s.addText("Experience  ·  2013 – 2026", { placeholder: "eyebrow" });
  const stops = ROLES.map((r) => ({ c: r.company, y: r.short })).reverse();
  stops.unshift({ c: "Earlier roles", y: "2013 – 18", muted: true });
  const n = stops.length, x0 = M, x1 = W - M, ly = 2.55, step = (x1 - x0) / n;
  rule(s, x0, ly, x1 - x0, MUTED_D);
  stops.forEach((st, i) => {
    const x = x0 + i * step;
    s.addShape(pres.shapes.OVAL, { x: x - 0.06, y: ly - 0.06, w: 0.12, h: 0.12, fill: { color: i === n - 1 ? RED : CREAM }, line: { color: i === n - 1 ? RED : CREAM, width: 0.5 } });
    mono(s, st.y, { x, y: ly - 0.5, w: step - 0.1, h: 0.25, color: MUTED_D });
    s.addText(st.c, { isTextBox: true, x, y: ly + 0.22, w: step - 0.1, h: 0.75, margin: 0, fontSize: 15, charSpacing: track(15, -0.025), color: st.muted ? MUTED_D : C.background1, valign: "top" });
  });
  headline(s, [{ text: "Thirteen years.\nOne through-line: " }, { text: "growth.", serif: true }], { y: 4.2, w: W - 2 * M, h: 2.5, pt: 64, color: C.background1 });
}

ROLES.forEach((r, i) => {
  const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "Experience" });
  s.addText(`${r.company}  ·  ${r.place}  ·  ${r.dates}`, { placeholder: "eyebrow" });
  mono(s, `${String(i + 1).padStart(2, "0")} / ${String(ROLES.length).padStart(2, "0")}`, { x: M, y: 1.6, w: 2, h: 0.25, color: MUTED });
  headline(s, r.role, { y: 2.0, w: 4.9, h: 2.6, pt: r.role.length > 40 ? 34 : 38, valign: "top" });
  s.addText(r.company, { isTextBox: true, x: M, y: H - M - 0.95, w: 4.9, h: 0.6, margin: 0, fontFace: SERIF, italic: true, fontSize: 30, color: RED, valign: "bottom" });
  rows(s, r.points.map((t) => ({ text: t })), { x: 6.0, y: 1.6, w: W - M - 6.0, pt: 14.5, gap: r.points.length >= 5 ? 0.15 : 0.22 });
});

// Earlier roles.
{
  const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "Experience" });
  s.addText("Teaching & earlier roles  ·  2013 – 2020", { placeholder: "eyebrow" });
  headline(s, [{ text: "Teaching, and\nwhere it " }, { text: "started.", serif: true }], { y: 2.0, w: 4.9, h: 2.6, pt: 44, valign: "top" });
  mono(s, "Lisbon, Portugal", { x: M, y: H - M - 0.4, w: 4.6, h: 0.25, color: MUTED, valign: "bottom" });
  rows(s, [
    { title: "EDIT – Disruptive Digital Education", meta: "Workshop instructor · 2018 – 2020", text: "Planned and delivered hands-on product-design workshops for groups of around 8 professionals, covering discovery through delivery." },
    { title: "comOn Group", meta: "2018", text: "Insurance and investment-banking clients (Fidelidade, Bankinvest); a service blueprint surfaced 40% of pain points." },
    { title: "NOSSA", meta: "2016 – 2018", text: "30+ websites and apps; grew the digital team from 2 to 6; delivered the UNICEF local-market site (33% increase in donations) and L'Oréal's flagship interactive table." },
    { title: "Tux&Gill", meta: "2014 – 2016", text: "Banking-product interfaces and story-driven interactive prototypes." },
    { title: "Leo Burnett, MUSTARD, AWD", meta: "2013 – 2014", text: "Early creative and digital design for Garnier, Samsung, Volvo and FOX." },
  ], { x: 5.8, y: 1.5, w: W - M - 5.8, pt: 14, titlePt: 16, gap: 0.11 });
}

pres.addSection({ title: "Education & more" });
{
  const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "Education & more" });
  s.addText("Education & professional development", { placeholder: "eyebrow" });
  headline(s, [{ text: "Always\n" }, { text: "learning.", serif: true }], { y: 2.0, w: 4.6, h: 2.6, pt: 48, valign: "top" });
  rows(s, [
    { title: "Reforge", meta: "2026", text: "AI Growth" },
    { title: "Reforge", meta: "2024", text: "Driving Growth with User Psychology" },
    { title: "Interaction Design Foundation", meta: "2018 – 2019", text: "User Research, Methods and Best Practices" },
    { title: "Interaction Design Foundation", meta: "2018 – 2019", text: "Design for Augmented and Virtual Reality" },
    { title: "Interaction Design Foundation", meta: "2019", text: "User Experience" },
  ], { x: 5.8, y: 1.6, w: W - M - 5.8, pt: 14.5, titlePt: 17, gap: 0.15 });
}
{
  const s = pres.addSlide({ masterName: "LIGHT", sectionTitle: "Education & more" });
  s.addText("Awards & languages", { placeholder: "eyebrow" });
  headline(s, [{ text: "Recognised\n" }, { text: "along the way.", serif: true }], { y: 2.0, w: 4.6, h: 2.6, pt: 48, valign: "top" });
  mono(s, "Awards", { x: 5.8, y: 1.3, w: 3, h: 0.25, color: MUTED });
  const ay = rows(s, [
    { title: "Young Lions 2017, Digital", text: "2nd place, High Potential, Shortlisted" },
    { title: "Auto Promotion Design", text: "Bronze, Honorable Mention" },
  ], { x: 5.8, y: 1.6, w: W - M - 5.8, pt: 14.5, titlePt: 17, gap: 0.15 });
  mono(s, "Languages", { x: 5.8, y: ay + 0.6, w: 3, h: 0.25, color: MUTED });
  const langs = [["Portuguese", "native / bilingual"], ["English", "professional working"], ["Spanish", "limited working"]];
  const lx = 5.8, lw = (W - M - 5.8);
  rule(s, lx, ay + 0.9, lw);
  langs.forEach(([l, lv], i) => {
    const x = lx + i * (lw / 3);
    s.addText(l, { isTextBox: true, x, y: ay + 1.05, w: lw / 3 - 0.2, h: 0.4, margin: 0, fontSize: 20, charSpacing: track(20, -0.03), color: C.text1, valign: "top" });
    mono(s, lv, { x, y: ay + 1.5, w: lw / 3 - 0.2, h: 0.3, color: MUTED });
  });
}

pres.addSection({ title: "Outro" });
{
  const s = pres.addSlide({ masterName: "DARK", sectionTitle: "Outro" });
  s.addText("Get in touch", { placeholder: "eyebrow" });
  s.addImage({ path: LAB("cream"), x: W - M - 3.4, y: 1.5, w: 3.4, h: 3.304 });
  headline(s, [{ text: "Let's build\nsomething " }, { text: "together.", serif: true }], { y: 1.9, w: 8.6, h: 3.2, pt: 72, color: C.background1 });
  rows(s, [
    { title: "rubensantanamangorrinha@gmail.com" },
    { title: "+351 916 525 749" },
    { title: "linkedin.com/in/rubenmangorrinha  ·  rubenmangorrinha.com" },
  ], { x: M, y: 5.5, w: 8.6, titlePt: 15, gap: 0.1, color: C.background1, lineColor: MUTED_D, dark: true });
}

(async () => {
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("wrote", OUT);
})();
