# Where the Light Rests · grillmysupervisor.online

A walkable, first-person gallery of sandstone and glass standing on the Ili grassland. Greetings and appreciations written at the board inside the first door get pinned on the glass boards above the sofas (the emptiest poster first, nearest the board), kind words can be pinned on any poster directly; complaints go in the one and only bin; on the terrace a grill cooks little avatar sausages that visitors add from the board beside it; alpacas graze on the meadow below.

Live at **https://grillmysupervisor.online** (GitHub Pages, deployed from the `main` branch).

The valley, grass, wildflowers, stream, lake, mountains, sky, sounds and the flock are forked from [vibe-shepherding](https://ranranli.net/vibe-shepherding/) (itself a clone of [hyraland/shepherd](https://github.com/hyraland/shepherd), MIT); the gallery and everything in it is built in code on top of that engine.

## Files

| Path | Purpose |
| --- | --- |
| `page.html` | The page as written (full document). `index.html` is built from it with the notes backend filled in |
| `index.html` | What the site serves |
| `src/app.js` | Wires it all up: renderer, lights, the walk, posters and bin, shared notes, quality levels |
| `src/gallery.js` | The gallery: corridor, glazing and its three doors, leather chesterfields and shelves, banner, the landscape glass note boards, decals, plants, the greeting board, the birthday signature board (balloons, bunting, names in eight handwriting fonts or drawn by hand), the four numbered guide balloons, the grill and its board, terrace, the trees along it, steps, bin, gate — the tally display by the start, the campfire by the stream (stone ring, shader flames, sparks, smoke, a flickering light, log seats, marshmallow sticks, its sign) — and the locked room behind the far door: the hinged door and its lock, a glass pavilion whose left wall and end wall are glass from floor to ceiling onto the valley itself (the meadow, the terrace trees, the mountains), a garden door in the left glass that opens by itself as you come near, with its own steps down to the meadow, and the three standing screens in an arc in front of the end glass, each a door to one of Ranran's projects on ranranli.net (`E` opens a pop-up with the link; the first two show preview cards from the projects, `assets/screens/`; `setScreen(i, url)` swaps a picture onto one); the two photo pennants on the banner strings — real photos cut out in two layers (`assets/photos.png`), the body swaying and the head bobbling on the neck (`tickPhotos`) |
| `src/siteConst.js` | Where the gallery stands in the valley and the shape of its platform (shared by the JS and GLSL terrain) |
| `src/butterflies.js` | A handful of butterflies over the meadow (in place of the engine's bumblebees, `bees.js`, which is kept but unused): flower-to-flower flight, eyespots, silent |
| `src/fireflies.js` | 萤火虫: blinking fireflies drifting over the meadow from dusk to dawn, never on the platform |
| `src/fireworks.js` | The midnight fireworks over the grassland (a GPU point cloud: rockets, peonies, chrysanthemums, willows, rings and crackles from sites out on the meadow, and every so often a volley that writes a message across the sky, facing wherever you are — in turn *Happy birthday JL!*, *Cheers to your future self! 🥂* and *genius Ranran & MAXLab (Oct 19, 2026)*, the list `MESSAGES` at the top of the file) |
| `src/birds.js` | Swallows wheeling over the meadow by day (instanced, flapping in bursts and gliding); the owl on the gate at night lives in `gallery.js`, its hoot in `audio.js` |
| `src/nightSky.js` | Shooting stars on the night dome (every 4.5–11 s, white head, pale-blue tail), after the starry background of ranranli.net; the twinkling tinted stars, the Milky Way and the four-pointed sparkles are in `sky.js` |
| `src/*` (the rest) | The vibe-shepherding engine: `terrain`, `world`, `grass`, `flowers`, `scenery`, `rivers`, `sky`, `bees`, `audio`, `music*`, `post`, `flock`, `sheep*`, `config`, `tuning`, `noise*`, `shaders`, `materials` — lightly patched so the terrain is level under the platform and no grass grows on it |
| `assets/` | Banner atlas, the two photo pennants (`photos.png`: frames at 2x, and each person's head and body cut out), the screen captures for the back room (`screens/`), bow, logos, tulip, the supervisor's avatar (`avatar.png`) and its sausage wrap (`sausage.png`), `alpaca.pack.txt` (the encrypted alpaca model, base64) and the bleat recordings |
| `tuning.json` | The look tuning from vibe-shepherding |
| `CNAME`, `.nojekyll` | GitHub Pages: custom domain, no Jekyll build |
| `LICENSE-shepherd` | The MIT license of the original *Herding Sheep on the Ili Grassland* |

## Controls

- **Desktop:** click the scene to look around, `W A S D` to walk, `Shift` to walk faster, `E` (or click) to read a poster, open the bin, add a sausage at the grill board, toast a marshmallow at the campfire, try the locked door or open one of the projects on the standing screens in the back room, `P` for the list of all posters, `[` `]` to move the clock, `Esc` to free the cursor.
- **Phone:** left thumb walks, right thumb looks, tap a poster, the bin or the grill board; the Posters button lists them all.
- **The clock** (top right) runs 00:00–24:00: the sun rises at six and sets at eight, the moon and the stars take over at night, and the standing lamps burn from 18:00 to 06:00. The valley's sounds are heard only once you step down onto the grass (by the steps at the first door, or out of the back room's garden door). In the evenings the sky fills with twinkling stars, the Milky Way and the odd shooting star, fireflies come out over the grassland, the campfire by the stream lights the meadow and an owl hoots from the gate; by day swallows wheel over the grass. At midnight (00:00 on the clock) fireworks go up over the grassland and, every 15 s or so, write a message across the sky — *Happy birthday JL!*, *Cheers to your future self! 🥂*, *genius Ranran & MAXLab (Oct 19, 2026)*, in turn.
- **The locked door** at the far end of the corridor asks for a password (checked in the page itself — `ROOM_PASSWORD` in `src/app.js`; it is a game, not a vault). The site says nothing more about what is behind it.

## Shared notes (Supabase)

The page talks to a Supabase project over its REST API with the publishable key (public by design); row-level security is what limits visitors:

- `public.notes` — one row per note: `kind` (`wall`, `bin`, `grill`, `sign` or `fire`), `poster`, `text` (≤ 200; a sausage is a row with kind `grill` and text 🌭; a marshmallow toasted at the campfire is kind `fire` and text 🔥; a signature on the birthday board is a row with kind `sign` and the name as text), `sig` (≤ 24; for a signature it carries the chosen hand and colour, `f<hand>c<ink>`), `ink` (≤ 6000; a hand-drawn signature as JSON strokes in a 1000×333 space), `at`, `hidden`, `owner_token` (write-only for the site). Anyone can read rows that are not hidden and add rows; a note can only be hidden through `delete_note` (own token or admin password), never edited. Every sausage is shown: twelve to a grate in a single layer, and another grill is wheeled out along the terrace whenever a grate fills (up to 44 grills, then they pile on the last one); the campfire shows 12 marshmallow sticks; the boards and pop-ups carry the full counts, and the tally by the entrance shows all of them.
- `public.posters` — one row per poster (`n` 1–14): `title`. Read-only from the site. **Rename a poster** by editing its `title` in the Supabase Table Editor; the page picks it up on its next refresh (every 30 s, or when a poster is opened).

Moderation: in the Table Editor tick `hidden` on a note to take it off the wall or out of the bin, or delete the row. From the site itself every note has a **delete** link: a note written from the same browser goes at once (each browser carries a random token, stored with its notes in `owner_token`, which nobody can read back); any other note asks for the admin password. The check happens in the database function `delete_note(p_id, p_token)` (SQL editor → Database → Functions), which hides the row rather than deleting it — change the password there.

The project URL and key live in `index.html` (`window.GRILL_CONFIG`), written by the build. The claude.ai artifact copy of the page keeps its notes in the artifact's own database instead, since its sandbox cannot reach outside services.

## DNS

Namecheap → Advanced DNS: four `A @` records to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`, and `CNAME www` → `catherineranran.github.io`. HTTPS is enforced in the repository's Pages settings.

## Credits

- *Herding Sheep on the Ili Grassland* by Hyraland — [hyraland/shepherd](https://github.com/hyraland/shepherd) (MIT License); forked here via vibe-shepherding, which swapped the sheep for alpacas.
- Alpaca: "Alpaca Animal" by Nyilonelycompany — [CGTrader](https://www.cgtrader.com/3d-models/animal/mammal/alpaca-animal) (Royalty Free License, bought by the site owner), recoloured. It ships only as an AES-GCM encrypted package decrypted in memory, so the model files are not redistributed.
- Sounds: sheep bleats from "Yo Frankie!" © Blender Foundation — [OpenGameArt](https://opengameart.org/content/sheep-sound-bleats-yo-frankie), CC BY 3.0 (pitch shifted per animal); "Sheep Baa" by AntumDeluge from a recording by mikewest — [OpenGameArt](https://opengameart.org/node/132779), CC0. Wind, water, bees, skylarks and music are synthesised live.
- Rendering: [three.js](https://threejs.org/) (MIT License).
