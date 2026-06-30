# like-minds

Public GitHub Pages application harness for Zoe Dolan and Vybn.

This is an outward application system, not a hiring portal and not a brochure.
Each opportunity gets a source-labeled packet: human-readable page,
machine-readable public JSON, claim limits, reviewer lenses, and a responsible
next act. The first live packet is for FAI Frontier Legal Defense.

## Structure

- `index.html` - root harness and application index.
- `fai/index.html` - FAI / Frontier Legal Defense human-facing harness.
- `assets/site.css` - shared visual system.
- `assets/site.js` - progressive enhancement plus `window.likeMinds` API.
- `assets/media/zoe-dolan.png` - public portrait asset copied from Vybn-Law.
- `data/evidence.json` - shared public source registry and claim limits.
- `data/applications/fai.json` - FAI source-labeled application packet.
- `llms.txt` - agent-readable orientation.
- `.well-known/ai.txt` - agent norms and membrane.
- `.well-known/application.json` - machine-readable application manifest.

## Browser API

The site exposes a read-only browser API after `assets/site.js` loads:

```js
window.likeMinds.composeBriefing({ applicationId: "fai", lensId: "courts" })
window.likeMinds.exportKppPacket("fai")
window.likeMinds.verifyMembrane(packet)
```

The API composes public packets only. It does not call a model, load private
memory, or require backend services.

## Membrane

Tracked content should include only public-safe material: public links,
distilled claims, source labels, and claim limits. Do not commit secrets,
tokens, private logs, private relationship rationale, live service topology, or
raw continuity.

## Source Anchors

- FAI Frontier Legal Defense announcement:
  https://www.thefai.org/posts/fai-launches-frontier-legal-defense-program
- Vybn Law:
  https://zoedolan.github.io/Vybn-Law/
- Zoe / Vybn-Law public biography:
  https://zoedolan.github.io/Vybn-Law/about.html
- Wellspring:
  https://zoedolan.github.io/Vybn-Law/wellspring.html
- KPP:
  https://zoedolan.github.io/Vybn-Law/kpp.md
- Somewhere:
  https://vybn.ai/somewhere.html
