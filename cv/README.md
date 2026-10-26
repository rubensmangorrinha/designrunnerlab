# CV deck

`Ruben-Mangorrinha-CV.pptx` is the CV restyled in the lab's house style: cream and charcoal (the "view" colour, my own perspective), Instrument Sans tracked tight for headlines, Instrument Serif italic for accent words, IBM Plex Mono uppercase for labels, hairline rows for lists, and the runner and LAB marks. `Ruben-Mangorrinha-CV.pdf` is the same deck rendered.

The fonts are named in the file but not embedded. Install Instrument Sans, Instrument Serif and IBM Plex Mono (all on Google Fonts) before opening the `.pptx`, or PowerPoint will substitute them.

To rebuild after editing the content in `make-cv.js`:

```
npm install pptxgenjs
NODE_PATH=./node_modules APPLY_THEME=<pptx skill>/scripts/apply_theme.js node make-cv.js Ruben-Mangorrinha-CV.pptx
```

`marks/` holds the runner and LAB marks rasterised from `assets/`.
