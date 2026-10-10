# Where the Light Rests · grillmysupervisor.online

A walkable, first-person 3D gallery of sandstone and glass, built with Three.js in a single `index.html`.
Kind words get pinned on the posters above the sofas; complaints go in the one and only bin.

Live at **https://grillmysupervisor.online** (GitHub Pages, deployed from the `main` branch).

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The whole site: scene, controls, posters, bin, the outdoors and the notes layer |
| `assets/` | Textures (photo banner, logos, tulip) and `alpaca.pack.txt`, the encrypted alpaca model (base64) shared with vibe-shepherding |
| `CNAME` | Tells GitHub Pages which custom domain serves the site |
| `.nojekyll` | Skips the Jekyll build so the page is served exactly as written |

## Outdoors

The glass door by the first sofa opens onto the terrace (and the grill). Steps lead down through the planter wall to a meadow where the alpacas from [vibe-shepherding](https://ranranli.net/vibe-shepherding/) graze. The wooden gate at the far side of the meadow opens that site in a new tab.

## Controls

- **Desktop:** click the scene to look around, `W A S D` to walk, `Shift` to walk faster, `E` (or click) to read a poster or open the bin, `[` `]` to move the sun, `Esc` to free the cursor.
- **Phone:** left thumb walks, right thumb looks, tap a poster or the bin.

## DNS for the custom domain

At Namecheap (Domain List → Manage → Advanced DNS), where `grillmysupervisor.online` is registered:

| Type | Host | Value |
| --- | --- | --- |
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| AAAA | `@` | `2606:50c0:8000::153` |
| AAAA | `@` | `2606:50c0:8001::153` |
| AAAA | `@` | `2606:50c0:8002::153` |
| AAAA | `@` | `2606:50c0:8003::153` |
| CNAME | `www` | `catherineranran.github.io` |

Once the records have propagated, turn on **Enforce HTTPS** in the repository's *Settings → Pages* (GitHub issues the certificate automatically; the option can take up to a day to become available).

## Shared notes backend

Inside claude.ai the page uses the artifact's own database. On the public site it needs a small backend of its own, otherwise notes stay on the visitor's screen only.

The page speaks the Supabase REST API. To connect one:

1. Create a free project at supabase.com and run this in its SQL editor:

   ```sql
   create table public.notes (
     id      uuid primary key default gen_random_uuid(),
     kind    text not null check (kind in ('wall', 'bin')),
     poster  int  not null default 0,
     text    text not null check (char_length(text) between 1 and 200),
     sig     text not null default '' check (char_length(sig) <= 24),
     at      timestamptz not null default now(),
     hidden  boolean not null default false
   );

   alter table public.notes enable row level security;

   create policy "anyone can read visible notes"
     on public.notes for select to anon using (hidden = false);

   create policy "anyone can leave a note"
     on public.notes for insert to anon with check (hidden = false);
   ```

2. Put the project URL and the `anon` public key into the `BACKEND` constant near the top of the script in `index.html`:

   ```js
   const BACKEND = { url: 'https://xxxx.supabase.co', key: 'eyJ…', table: 'notes' };
   ```

The `anon` key is meant to be public; the row-level-security policies above are what limit what visitors can do (read notes that are not hidden, add notes within the length limits, nothing else).

### Moderation

Open the `notes` table in the Supabase dashboard. Tick `hidden` on a row to take it off the wall or out of the bin without deleting it, or delete the row outright. Visitors cannot edit or delete notes from the site.

## Credits

- Alpaca: "Alpaca Animal" by Nyilonelycompany (CGTrader Royalty Free License, bought by the site owner). As in vibe-shepherding, the model ships only as an AES-GCM encrypted package (`assets/alpaca.pack.txt`, base64) that the page decrypts in memory, so the model files themselves are not redistributed.
- Scene, furniture, trees, grass and the grill are generated in code with [three.js](https://threejs.org/) r128.
