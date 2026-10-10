# Where the Light Rests · grillmysupervisor.online

A walkable, first-person gallery of sandstone and glass standing on the Ili grassland. Birthday wishes written at the board inside the first door get pinned on the posters above the sofas (the emptiest poster first, nearest the board), kind words can be pinned on any poster directly; complaints go in the one and only bin; on the terrace a grill cooks little avatar sausages that visitors add from the board beside it; alpacas graze on the meadow below.

Live at **https://grillmysupervisor.online** (GitHub Pages, deployed from the `main` branch).

The valley, grass, wildflowers, stream, lake, mountains, sky, sounds and the flock are forked from [vibe-shepherding](https://ranranli.net/vibe-shepherding/) (itself a clone of [hyraland/shepherd](https://github.com/hyraland/shepherd), MIT); the gallery and everything in it is built in code on top of that engine.

## Files

| Path | Purpose |
| --- | --- |
| `page.html` | The page as written (full document). `index.html` is built from it with the notes backend filled in |
| `index.html` | What the site serves |
| `src/app.js` | Wires it all up: renderer, lights, the walk, posters and bin, shared notes, quality levels |
| `src/gallery.js` | The gallery: corridor, glazing and its three doors, furniture, banner, posters, boards, decals, plants, the wish board, the grill and its board, terrace, the trees along it, steps, bin, gate |
| `src/siteConst.js` | Where the gallery stands in the valley and the shape of its platform (shared by the JS and GLSL terrain) |
| `src/*` (the rest) | The vibe-shepherding engine: `terrain`, `world`, `grass`, `flowers`, `scenery`, `rivers`, `sky`, `bees`, `audio`, `music*`, `post`, `flock`, `sheep*`, `config`, `tuning`, `noise*`, `shaders`, `materials` — lightly patched so the terrain is level under the platform and no grass grows on it |
| `assets/` | Banner atlas, bow, logos, tulip, the supervisor's avatar (`avatar.png`) and its sausage wrap (`sausage.png`), `alpaca.pack.txt` (the encrypted alpaca model, base64) and the bleat recordings |
| `tuning.json` | The look tuning from vibe-shepherding |
| `CNAME`, `.nojekyll` | GitHub Pages: custom domain, no Jekyll build |
| `LICENSE-shepherd` | The MIT license of the original *Herding Sheep on the Ili Grassland* |

## Controls

- **Desktop:** click the scene to look around, `W A S D` to walk, `Shift` to walk faster, `E` (or click) to read a poster, open the bin or add a sausage at the grill board, `P` for the list of all posters, `[` `]` to move the clock, `Esc` to free the cursor.
- **Phone:** left thumb walks, right thumb looks, tap a poster, the bin or the grill board; the Posters button lists them all.
- **The clock** (top right) runs 00:00–24:00: the sun rises at six and sets at eight, the moon and the stars take over at night, and the standing lamps burn from 18:00 to 06:00. The valley's sounds are heard only once you step down onto the grass.

## Shared notes (Supabase)

The page talks to a Supabase project over its REST API with the publishable key (public by design); row-level security is what limits visitors:

- `public.notes` — one row per note: `kind` (`wall`, `bin` or `grill`), `poster`, `text` (≤ 200; a sausage is a row with kind `grill` and text 🌭), `sig` (≤ 24), `at`, `hidden`. Anyone can read rows that are not hidden and add rows; nobody can edit or delete from the site. The grill shows up to 16 sausages at a time; its board carries the full count.
- `public.posters` — one row per poster (`n` 1–14): `title`. Read-only from the site. **Rename a poster** by editing its `title` in the Supabase Table Editor; the page picks it up on its next refresh (every 30 s, or when a poster is opened).

Moderation: in the Table Editor tick `hidden` on a note to take it off the wall or out of the bin, or delete the row.

The project URL and key live in `index.html` (`window.GRILL_CONFIG`), written by the build. The claude.ai artifact copy of the page keeps its notes in the artifact's own database instead, since its sandbox cannot reach outside services.

## DNS

Namecheap → Advanced DNS: four `A @` records to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`, and `CNAME www` → `catherineranran.github.io`. HTTPS is enforced in the repository's Pages settings.

## Credits

- *Herding Sheep on the Ili Grassland* by Hyraland — [hyraland/shepherd](https://github.com/hyraland/shepherd) (MIT License); forked here via vibe-shepherding, which swapped the sheep for alpacas.
- Alpaca: "Alpaca Animal" by Nyilonelycompany — [CGTrader](https://www.cgtrader.com/3d-models/animal/mammal/alpaca-animal) (Royalty Free License, bought by the site owner), recoloured. It ships only as an AES-GCM encrypted package decrypted in memory, so the model files are not redistributed.
- Sounds: sheep bleats from "Yo Frankie!" © Blender Foundation — [OpenGameArt](https://opengameart.org/content/sheep-sound-bleats-yo-frankie), CC BY 3.0 (pitch shifted per animal); "Sheep Baa" by AntumDeluge from a recording by mikewest — [OpenGameArt](https://opengameart.org/node/132779), CC0. Wind, water, bees, skylarks and music are synthesised live.
- Rendering: [three.js](https://threejs.org/) (MIT License).
