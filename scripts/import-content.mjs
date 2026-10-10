// One-time importer: converts the two launch nail articles out of the
// sewinsnearme repo (api/seed-posts.ts template-literal constants) into
// data/posts.json for NailDex.
//
// The text is the owner's own published content. The only edits are
// link retargeting from the sewinsnearme journal to NailDex pages
// (see REPLACEMENTS) and dropping the closing sections that point at the
// sewinsnearme stylist directory, which the templates replace with a
// NailDex follow block.
//
// Usage: node scripts/import-content.mjs
// Optional env: SEWINS_REPO=/path/to/sewinsnearme/repo

import fs from 'node:fs';
import path from 'node:path';

const REPO = process.env.SEWINS_REPO
  || path.resolve(process.env.HOME, 'workspace/sewinsnearme/repo');
const seedFile = path.join(REPO, 'api/seed-posts.ts');
const src = fs.readFileSync(seedFile, 'utf8');

function extractConst(name) {
  const marker = 'const ' + name + ' = `';
  const start = src.indexOf(marker);
  if (start === -1) throw new Error('constant not found: ' + name);
  let i = start + marker.length;
  let out = '';
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') { out += src[i + 1]; i += 2; continue; }
    if (c === '`') break;
    out += c; i++;
  }
  return out;
}

function extractMeta(slug) {
  const blockStart = src.indexOf('slug: "' + slug + '"');
  if (blockStart === -1) throw new Error('post not found: ' + slug);
  const block = src.slice(blockStart, blockStart + 2000);
  const grab = (key) => {
    const m = block.match(new RegExp(key + ':\\s*"([\\s\\S]*?)"\\s*,'));
    if (!m) throw new Error('meta ' + key + ' not found for ' + slug);
    return m[1];
  };
  return { title: grab('title'), excerpt: grab('excerpt'), coverImage: grab('coverImage') };
}

// Link retargeting from the sewinsnearme journal to NailDex.
const REPLACEMENTS = [
  [
    'start at [Sew Ins Near Me](/) and browse the rest of the [journal](/blog) for the hair half of your fall appointment',
    'start at [NailDex](/) and browse the [inspo journal](/blog) for more seasonal collections',
  ],
  [
    'Pairing a fresh set with a fresh install? Our [20 sew-in hairstyles for October](/blog/20-sew-in-hairstyles-for-october) and [20 sew-in weave hairstyles for fall 2026](/blog/20-sew-in-weave-hairstyles-for-fall-2026) use the same burgundy, copper, and chocolate palette as the sets below.',
    'Want the full season instead of just the month? Our [39 fall nail ideas](/blog/39-fall-nail-ideas-in-2026) use the same burgundy, copper, and chocolate palette as the sets below.',
  ],
  [
    ', and the [20 sew-in weave hairstyles for fall 2026](/blog/20-sew-in-weave-hairstyles-for-fall-2026) use the same burgundy, copper, and chocolate tones for the hair side of the appointment',
    '',
  ],
];

function applyReplacements(md, label) {
  let out = md;
  for (const [from, to] of REPLACEMENTS) {
    if (out.includes(from)) {
      out = out.split(from).join(to);
      console.log('  retargeted link text in', label);
    }
  }
  return out;
}

function parseArticle(md) {
  const chunks = md.split(/^## /m);
  const introMd = chunks[0].trim();
  const designs = [];
  let faq = [];
  const dropped = [];
  for (const chunk of chunks.slice(1)) {
    const nl = chunk.indexOf('\n');
    const heading = chunk.slice(0, nl).trim();
    const body = chunk.slice(nl + 1).trim();
    const designMatch = heading.match(/^(\d+)\.\s+(.+)$/);
    if (designMatch) {
      const imgMatch = body.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      if (!imgMatch) throw new Error('design missing image: ' + heading);
      const tipMarker = '**Ask your nail tech for:**';
      const tipIdx = body.indexOf(tipMarker);
      if (tipIdx === -1) throw new Error('design missing tip: ' + heading);
      const descMd = body.slice(imgMatch.index + imgMatch[0].length, tipIdx).trim();
      const tip = body.slice(tipIdx + tipMarker.length).trim();
      designs.push({
        n: Number(designMatch[1]),
        name: designMatch[2].trim(),
        image: imgMatch[2],
        alt: imgMatch[1],
        description: descMd,
        tip,
      });
    } else if (heading.startsWith('Frequently Asked Questions')) {
      const qChunks = body.split(/^### /m).slice(1);
      faq = qChunks.map((qc) => {
        const qNl = qc.indexOf('\n');
        return { q: qc.slice(0, qNl).trim(), a: qc.slice(qNl + 1).trim() };
      });
    } else {
      dropped.push(heading);
    }
  }
  const intro = introMd.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  return { intro, designs, faq, dropped };
}

const ARTICLES = [
  {
    slug: '31-october-nail-ideas-in-2026',
    constName: 'OCTOBER_NAILS_2026_CONTENT',
    category: 'October',
    hubSlug: 'october',
    publishedAt: '2026-10-10',
    pinImage: '/images/pins/31-october-nail-ideas-in-2026-pin.jpg',
    pinUrl: 'https://www.pinterest.com/pin/1082552830401340331',
    videos: {
      longForm: 'https://www.youtube.com/watch?v=Z4EcUciaUb0',
      longFormEmbed: 'https://www.youtube-nocookie.com/embed/Z4EcUciaUb0',
      shorts: [
        { title: '31 Stunning October Nail Designs', url: 'https://youtube.com/shorts/FLPp8przk1c' },
        { title: 'The October nail design chart Short', url: 'https://youtube.com/shorts/6Xt9D9A9R8s' },
      ],
    },
  },
  {
    slug: '39-fall-nail-ideas-in-2026',
    constName: 'FALL_NAILS_2026_CONTENT',
    category: 'Fall',
    hubSlug: 'fall',
    publishedAt: '2026-10-11',
    pinImage: '/images/pins/39-fall-nail-ideas-in-2026-pin.jpg',
    pinUrl: null,
    videos: null,
  },
];

const posts = [];
for (const spec of ARTICLES) {
  console.log('Importing', spec.slug);
  const meta = extractMeta(spec.slug);
  const md = applyReplacements(extractConst(spec.constName), spec.slug);
  const parsed = parseArticle(md);
  console.log(
    '  designs:', parsed.designs.length,
    '| faq:', parsed.faq.length,
    '| dropped sections:', parsed.dropped.join('; ') || 'none',
  );
  // Validation
  const joined = JSON.stringify(parsed);
  for (const bad of ['/stylists', '/blog/20-', 'Sew Ins Near Me](', 'sew-in weave']) {
    if (joined.includes(bad)) throw new Error('residual sewinsnearme reference ' + bad + ' in ' + spec.slug);
  }
  for (const d of parsed.designs) {
    const imgPath = path.join(REPO, 'public', d.image);
    if (!fs.existsSync(imgPath)) throw new Error('missing image ' + d.image);
  }
  posts.push({
    slug: spec.slug,
    title: meta.title,
    excerpt: meta.excerpt,
    category: spec.category,
    hubSlug: spec.hubSlug,
    publishedAt: spec.publishedAt,
    designCount: parsed.designs.length,
    coverImage: meta.coverImage,
    pinImage: spec.pinImage,
    pinUrl: spec.pinUrl,
    videos: spec.videos,
    intro: parsed.intro,
    designs: parsed.designs,
    faq: parsed.faq,
  });
}

const outFile = path.resolve(process.cwd(), 'data/posts.json');
fs.writeFileSync(outFile, JSON.stringify({ posts }, null, 2) + '\n');
console.log('Wrote', outFile, 'with', posts.length, 'posts');
