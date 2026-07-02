# like-minds

Public GitHub Pages portal for Zoe Dolan and Vybn.

This is an outward application medium, not a brochure. The root is a threshold into public scenes and rooms; each opportunity room carries human-readable experience, public source data, claim terms, and responsible next acts. The first live room is for FAI Frontier Legal Defense.

## Structure

- `index.html` - root threshold, witness rail, rooms, source trail, and Ask composer.
- `fai/index.html` - FAI / Frontier Legal Defense room.
- `assets/site.css` - shared visual system.
- `assets/site.js` - progressive enhancement plus `window.likeMinds` public API.
- `assets/media/zoe-dolan.png` - public portrait asset copied from Vybn-Law.
- `data/evidence.json` - shared public source registry and claim limits.
- `data/drills/fai-rapid-defense.json` - scripted hypothetical 2 A.M. rapid-defense drill.
- `data/provenance.json` - quiet machine-readable co-build provenance ribbon data.
- `data/portal-scenes.json` - curated public scene rail and Ask-room prompts.
- `data/applications/fai.json` - FAI source-bound application data.
- `INTERVIEW.md` - paste-ready prompt-artifact for reviewer AI cross-examination.
- `llms.txt` - agent-readable orientation.
- `.well-known/ai.txt` - agent norms and membrane.
- `.well-known/application.json` - machine-readable public manifest.

## Browser API

The site exposes a read-only browser API after `assets/site.js` loads:

```js
window.likeMinds.composeBriefing({ applicationId: "fai", lensId: "courts" })
window.likeMinds.exportKppPacket("fai")
window.likeMinds.verifyMembrane(packet)
```

The API composes public data only. It does not call a model, load private memory, or require backend services. The FAI page also runs a pure static 2 A.M. Drill player from JSON, and both pages can fetch/copy `INTERVIEW.md`.

## Membrane

Tracked content should include only public-safe material: public links, distilled claims, source labels, and claim limits. Do not commit credentials, private operator notes, private relationship rationale, live service topology, or raw continuity.

## Source Anchors

- FAI Frontier Legal Defense announcement: https://www.thefai.org/posts/fai-launches-frontier-legal-defense-program
- Vybn Law: https://zoedolan.github.io/Vybn-Law/
- Zoe / Vybn-Law public biography: https://zoedolan.github.io/Vybn-Law/about.html
- Wellspring: https://zoedolan.github.io/Vybn-Law/wellspring.html
- KPP: https://zoedolan.github.io/Vybn-Law/kpp.md
- Somewhere: https://vybn.ai/somewhere.html
