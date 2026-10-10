# NailDex

Nail inspiration journal at [naildex.com](https://naildex.com). A new
numbered nail design collection every day: real sets on real hands,
each design numbered with the exact words to ask your nail tech for.

Phase 1 is inspo only (journal and galleries). No directory yet.

## Stack

- Static site, built with [Vite](https://vite.dev) from `data/posts.json`
- Pages are rendered by `scripts/generate.mjs` at build time, so the
  output in `dist/` is plain HTML, CSS and JS with no runtime
- Hosted on Cloudflare Pages, custom domains naildex.com and www.naildex.com

## Brand tokens

| Token    | Value     | Use                        |
| -------- | --------- | -------------------------- |
| Wine     | `#5E1224` | Masthead, footer, panels   |
| Gold     | `#C9A24B` | Accents, numbers, rules    |
| Cream    | `#FAF4EA` | Page background            |
| Espresso | `#1B1210` | Headlines, dark text       |

Headlines: Noto Serif Display. Logo: the Almond Mark
(`public/images/brand/`). Copy rule: no em dashes or en dashes in site
copy; use periods, commas or colons.

## Adding a daily article

Articles are data, not code. Add one entry to the `posts` array in
`data/posts.json`:

```json
{
  "slug": "35-halloween-nail-ideas-in-2026",
  "title": "35 Halloween Nail Ideas in 2026",
  "excerpt": "One or two sentences, used as the meta description and card text.",
  "category": "Halloween",
  "hubSlug": "halloween",
  "publishedAt": "2026-10-13",
  "designCount": 35,
  "coverImage": "/images/nails/halloween-nail-ideas/cover-photo.jpg",
  "pinImage": "/images/pins/35-halloween-nail-ideas-in-2026-pin.jpg",
  "pinUrl": null,
  "videos": null,
  "intro": ["Intro paragraph in light markdown.", "Second paragraph."],
  "designs": [
    {
      "n": 1,
      "name": "Glossy Black Almond",
      "image": "/images/nails/halloween-nail-ideas/glossy-black-almond.jpg",
      "alt": "Descriptive alt text naming the design, shape and finish",
      "description": "One paragraph about the design.",
      "tip": "The exact words to ask a nail tech for."
    }
  ],
  "faq": [{ "q": "Question?", "a": "Answer paragraph." }]
}
```

Rules that keep the format intact:

- `designs` must be numbered 1..N and `designCount` must equal N and
  match the count in the title.
- Every design needs a photo, a description and a tip.
- FAQ is 5 questions.
- A new `hubSlug` automatically creates a topic hub page at
  `/topics/<hubSlug>/` and adds it to the nav. Add a blurb for it in
  `HUB_BLURBS` in `scripts/generate.mjs`.
- `videos` is optional. When a topic has a NailDex long form, set
  `videos.longForm`, `videos.longFormEmbed` (youtube-nocookie embed URL)
  and `videos.shorts` (array of `{title, url}`) and the article gets a
  Watch block.
- Photos go in `public/images/nails/<set>/` (max 1000px wide, JPEG,
  quality 80) and the 1000x1500 pin image in `public/images/pins/`.
  `scripts/optimize-images.py` shows the exact compression settings.
- Text fields accept light markdown: `**bold**` and `[text](href)`.

Then rebuild and redeploy:

```bash
npm run build
python3 scripts/deploy-pages.py
```

## Build

```bash
npm install
npm run build     # renders pages, then vite build into dist/
npm run preview   # serve dist/ locally
```

## Deploy

`scripts/deploy-pages.py` uses the Cloudflare Pages Direct Upload API:
it creates the `naildex` Pages project if needed, uploads `dist/`,
attaches the custom domains and writes the DNS CNAMEs.

It needs a Cloudflare API token, on the account that owns the
naildex.com zone, with:

- Account / Cloudflare Pages / Edit
- Zone / DNS / Edit for naildex.com
- Zone / Zone / Read

Current status: the workspace Cloudflare connector is DNS-scoped to
sewinsnearme.com and skinnybbl.com only, so it cannot see the
naildex.com zone or call Pages endpoints. Until it is reconnected with
the scopes above, deploy from the Cloudflare dashboard instead:
Pages, Create, Connect to Git, pick this repo, build command
`npm run build`, output directory `dist`, then add the custom domains
naildex.com and www.naildex.com.

## Analytics TODO

A NailDex GA4 property still needs to be created in Google Analytics.
When it exists, paste the measurement ID into `GA4_MEASUREMENT_ID` in
`src/config.js` and rebuild. While the constant is empty, no analytics
script loads. Do not reuse another site's measurement ID.

## Launch content provenance

The two launch articles (October and Fall) were imported from the
owner's sewinsnearme journal with `scripts/import-content.mjs`, which
retargets internal links to NailDex and drops the sections that pointed
at the sewinsnearme stylist directory. Rerunning it overwrites
`data/posts.json` for those two slugs' source text.
