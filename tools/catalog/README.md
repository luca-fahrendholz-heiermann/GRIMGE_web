# Visual catalog (Arcane States & spells → PowerPoint)

Regenerates `docs/GRIMGE_Visueller_Katalog.pptx` from in-game screenshots (Training, hero Astral).

1. `PORT=8793 node server.js` (project root)
2. `node tools/catalog/capture_all.mjs http://localhost:8793/ <shotDir>` — headless Chrome, 4 shots per Arcane State (idle / forward / up / down full) and one per spell, plus `manifest.json`
3. `node tools/catalog/batch_jpg.mjs <shotDir> <jpgDir> 960 0.78` and copy `manifest.json` into `<jpgDir>`
4. In a folder with `npm install pptxgenjs@3` (copy `build_pptx.mjs` there): `node build_pptx.mjs <jpgDir> docs/GRIMGE_Visueller_Katalog_v4.pptx public/src`

Special runes are grouped like the deck builder (Einfach, Mehrfach, Haltungen, Beschwörung, Atmungen, Sphären) with their mana cost; every breathing gets its own slide with all moves (normal, charge forward / up / down, sprint, crash).

Needs Google Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe`. The pptx is not committed (≈ 55 MB).
