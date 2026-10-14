// Renders every page of naildex.com from data/posts.json into static
// HTML files at the project root, where vite.config.mjs picks them up
// as build inputs. Also writes public/sitemap.xml and public/robots.txt
// and generated-pages.json.
//
// Run directly (node scripts/generate.mjs) or via npm run build.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SITE_URL = 'https://naildex.com';
const YT_CHANNEL = 'https://www.youtube.com/@naildex';
const PINTEREST = 'https://www.pinterest.com/sewinsnearmeofficial/';

const { posts } = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/posts.json'), 'utf8'));
const sorted = [...posts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
const hubs = [...new Map(posts.map((p) => [p.hubSlug, p.category])).entries()]
  .map(([slug, name]) => ({ slug, name }));

const HUB_BLURBS = {
  october:
    'The richest month in the nail calendar: burgundy, black cherry, tortoiseshell, copper chrome and subtle Halloween sets, all on real hands.',
  fall:
    'The full season palette: chocolate, espresso, tortoise, plaid, leaves and cozy knit energy across almond, coffin, square and oval shapes.',
  halloween:
    'Ghosts, jack-o-lanterns, blood drip and matte black everything: Halloween sets on real hands, from cute short designs to full stiletto drama.',
  'fall-almond':
    'Fall in its hardest working shape: burgundy, tortoise, chocolate and copper chrome on almond nails, with French tips, leaf art and ombre sets on every skin tone.',
  'short-october':
    'Short nails, full October: oxblood, chocolate, tortoise and pumpkin art at natural lengths, on square, squoval and oval shapes that still type, text and open jars.',
  'tortoiseshell-fall':
    'The pattern of the season in every dose: full amber marble, tortoise French tips, gold foil and olive tortoise, with espresso and chocolate solids where the pattern rests.',
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];
function fmtDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return MONTHS[m - 1] + ' ' + d + ', ' + y;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Minimal inline markdown: **bold** and [text](href). Input is escaped first.
function inline(md) {
  return esc(md)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}
function paras(mdArray) {
  return mdArray.map((p) => '<p>' + inline(p) + '</p>').join('\n');
}

function head({ title, description, canonical, ogType = 'website', ogImage = null, extra = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:site_name" content="NailDex">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
${ogImage ? '<meta property="og:image" content="' + SITE_URL + ogImage + '">' : ''}
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Display:wght@500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/src/styles.css">
${extra}
</head>`;
}

function header() {
  return `<header class="site-header">
  <div class="wrap">
    <a class="brand" href="/" aria-label="NailDex home">
      <img src="/images/brand/mark-64.png" alt="NailDex almond mark" width="40" height="40">
      <span class="wordmark">Nail<em>Dex</em></span>
    </a>
    <nav class="main-nav" aria-label="Main">
      <a href="/blog/">Journal</a>
      ${hubs.map((h) => '<a href="/topics/' + h.slug + '/">' + esc(h.name) + '</a>').join('\n      ')}
      <a href="/about/">About</a>
      <a class="btn btn-gold" href="${YT_CHANNEL}" rel="noopener" target="_blank">Watch</a>
    </nav>
  </div>
</header>`;
}

function footer() {
  return `<footer class="site-footer">
  <div class="wrap">
    <img class="lockup" src="/images/brand/lockup-cream.png" alt="NailDex" width="700" height="218">
    <nav aria-label="Footer">
      <a href="/">Home</a>
      <a href="/blog/">Journal</a>
      ${hubs.map((h) => '<a href="/topics/' + h.slug + '/">' + esc(h.name) + '</a>').join('\n      ')}
      <a href="/about/">About</a>
    </nav>
    <nav aria-label="Social">
      <a href="${YT_CHANNEL}" rel="noopener" target="_blank">YouTube</a>
      <a href="${PINTEREST}" rel="noopener" target="_blank">Pinterest</a>
    </nav>
    <p class="fine">New nail designs every day. Screenshot your favorites and show your nail tech.</p>
    <p class="fine">&copy; <span id="year">2026</span> NailDex. All rights reserved.</p>
  </div>
</footer>
<script type="module" src="/src/main.js"></script>
</body>
</html>`;
}

function card(post) {
  return `<article class="card">
    <figure><a href="/blog/${post.slug}/"><img src="${post.coverImage}" alt="${esc(post.designs[0].alt)}" loading="lazy"></a></figure>
    <div class="body">
      <p class="meta">${esc(post.category)}<span class="dot">&bull;</span>${post.designCount} designs</p>
      <h3><a href="/blog/${post.slug}/">${esc(post.title)}</a></h3>
      <p>${esc(post.excerpt)}</p>
    </div>
  </article>`;
}

function saveBlock(post) {
  const pinLink = post.pinUrl || PINTEREST;
  const pinLabel = post.pinUrl ? 'Open the pin' : 'Follow on Pinterest';
  return `<section class="save-block" aria-label="Save this collection">
    <img src="${post.pinImage}" alt="${esc(post.title)} pin image with featured designs" loading="lazy" width="1000" height="1500">
    <div>
      <h2>Save this collection</h2>
      <p>Keep all ${post.designCount} designs in one place. Save the collection on Pinterest, then show your favorites to your nail tech at your next appointment.</p>
      <a class="btn btn-gold" href="${pinLink}" rel="noopener" target="_blank">${pinLabel}</a>
    </div>
  </section>`;
}

function watchBlock(post) {
  if (!post.videos) return '';
  const v = post.videos;
  const shorts = v.shorts.map((s) =>
    '<li><a href="' + s.url + '" rel="noopener" target="_blank">' + esc(s.title) + '</a></li>').join('\n        ');
  return `<section aria-label="Watch this collection">
    <h2 class="serif">Watch this collection</h2>
    <div class="video-embed">
      <iframe src="${v.longFormEmbed}" title="${esc(post.title)} on YouTube" loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
    </div>
    <p>Prefer it short? Watch the Shorts:</p>
    <ul>
        ${shorts}
    </ul>
  </section>`;
}

function followBlock(post) {
  const related = sorted.filter((p) => p.slug !== post.slug).slice(0, 2);
  return `<section class="follow-block" aria-label="Follow NailDex">
    <h2>Follow NailDex</h2>
    <p>A new numbered collection lands every day. Follow along so the next set finds you first.</p>
    <div class="follow-links">
      <a class="btn btn-wine" href="${YT_CHANNEL}" rel="noopener" target="_blank">NailDex on YouTube</a>
      <a class="btn btn-outline" href="${PINTEREST}" rel="noopener" target="_blank">NailDex boards on Pinterest</a>
      <a class="btn btn-outline" href="/blog/">More collections</a>
    </div>
    ${related.length ? '<h3 class="serif">Keep browsing</h3><div class="cards">' + related.map(card).join('\n') + '</div>' : ''}
  </section>`;
}

function articlePage(post) {
  const designsHtml = post.designs.map((d) => `<section class="design" id="design-${d.n}">
      <div class="design-head"><span class="num">${d.n}</span><h2>${esc(d.name)}</h2></div>
      <figure><img src="${d.image}" alt="${esc(d.alt)}" ${d.n > 2 ? 'loading="lazy"' : ''}></figure>
      <p>${inline(d.description)}</p>
      <div class="tip"><strong>Ask your nail tech for:</strong> ${inline(d.tip)}</div>
    </section>`).join('\n    ');

  const faqHtml = post.faq.map((f) => `<h3>${esc(f.q)}</h3>\n      <p>${inline(f.a)}</p>`).join('\n      ');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: [SITE_URL + post.coverImage],
    datePublished: post.publishedAt,
    author: { '@type': 'Organization', name: 'NailDex', url: SITE_URL },
    publisher: { '@type': 'Organization', name: 'NailDex', url: SITE_URL },
    mainEntityOfPage: SITE_URL + '/blog/' + post.slug + '/',
  };

  const body = `${header()}
<main class="narrow">
  <div class="article-head">
    <p class="meta"><a href="/topics/${post.hubSlug}/">${esc(post.category)}</a><span class="dot">&bull;</span>${post.designCount} designs<span class="dot">&bull;</span>${fmtDate(post.publishedAt)}</p>
    <h1>${esc(post.title)}</h1>
    <p class="excerpt">${esc(post.excerpt)}</p>
  </div>
  <div class="article-body">
    ${paras(post.intro)}
  </div>
  ${saveBlock(post)}
  ${watchBlock(post)}
  <div>
    ${designsHtml}
  </div>
  <section class="faq" aria-label="Frequently asked questions">
    <h2>Frequently Asked Questions</h2>
      ${faqHtml}
  </section>
  ${followBlock(post)}
</main>
${footer()}`;

  return head({
    title: post.title + ' | NailDex',
    description: post.excerpt,
    canonical: SITE_URL + '/blog/' + post.slug + '/',
    ogType: 'article',
    ogImage: post.coverImage,
    extra: '<script type="application/ld+json">' + JSON.stringify(jsonLd) + '</script>',
  }) + '\n<body>\n' + body;
}

function homePage() {
  const featured = sorted[0];
  const body = `${header()}
<main class="wrap">
  <section class="hero">
    <p class="kicker">Nail inspiration, updated daily</p>
    <h1>Find your next set.</h1>
    <hr class="gold-rule">
    <p class="lede">Numbered nail design collections on real hands: every finish, every shape, every skin tone. Screenshot the number, show your tech, done.</p>
  </section>
  <article class="featured">
    <figure><a href="/blog/${featured.slug}/"><img src="${featured.coverImage}" alt="${esc(featured.designs[0].alt)}"></a></figure>
    <div class="body">
      <p class="meta">Newest collection<span class="dot">&bull;</span>${esc(featured.category)}</p>
      <h2><a href="/blog/${featured.slug}/">${esc(featured.title)}</a></h2>
      <p>${esc(featured.excerpt)}</p>
      <p><a class="btn btn-wine" href="/blog/${featured.slug}/">See all ${featured.designCount} designs</a></p>
    </div>
  </article>
  <div class="section-head"><h2>Latest collections</h2><a href="/blog/">View the journal</a></div>
  <div class="cards">
    ${sorted.map(card).join('\n    ')}
  </div>
  <section class="watch-strip" aria-label="Watch on NailDex">
    <div>
      <h2>Watch on NailDex</h2>
      <p>Every collection is also a video. The October long form runs the full 100 designs, and the Shorts break the set into saveable parts, each one linked back to the full video.</p>
      <a class="btn btn-gold" href="${YT_CHANNEL}" rel="noopener" target="_blank">Visit the channel</a>
    </div>
    <figure>
      <img src="${posts.find((p) => p.videos).coverImage}" alt="October nail designs video cover photo" loading="lazy">
      <a class="play" href="${posts.find((p) => p.videos).videos.longForm}" rel="noopener" target="_blank" aria-label="Watch 100 October Nail Ideas in 2026 on YouTube">&#9654;</a>
    </figure>
  </section>
  <div class="section-head"><h2>Browse by season</h2></div>
  <div class="hub-row">
    ${hubs.map((h) => '<a class="hub-chip" href="/topics/' + h.slug + '/">' + esc(h.name) + ' nails</a>').join('\n    ')}
  </div>
</main>
${footer()}`;
  return head({
    title: 'NailDex | Nail Ideas and Design Inspiration, Updated Daily',
    description: 'Numbered nail design collections on real hands: fall, October, chrome, French tips and more. Screenshot your favorites and show your nail tech.',
    canonical: SITE_URL + '/',
    ogImage: featured.coverImage,
  }) + '\n<body>\n' + body;
}

function blogIndexPage() {
  const body = `${header()}
<main class="wrap">
  <div class="page-head">
    <p class="meta">The NailDex journal</p>
    <h1>Nail Inspo Journal</h1>
    <p>Every collection, newest first. Each one is numbered design by design, with the exact words to ask your nail tech for.</p>
  </div>
  <div class="cards">
    ${sorted.map(card).join('\n    ')}
  </div>
</main>
${footer()}`;
  return head({
    title: 'Nail Inspo Journal | NailDex',
    description: 'All NailDex nail design collections: October nails, fall nails and more, each with numbered designs and nail tech tips.',
    canonical: SITE_URL + '/blog/',
    ogImage: sorted[0].coverImage,
  }) + '\n<body>\n' + body;
}

function hubPage(hub) {
  const hubPosts = sorted.filter((p) => p.hubSlug === hub.slug);
  const body = `${header()}
<main class="wrap">
  <div class="page-head">
    <p class="meta">Collection hub</p>
    <h1>${esc(hub.name)} Nails</h1>
    <p>${esc(HUB_BLURBS[hub.slug] || '')}</p>
  </div>
  <div class="cards">
    ${hubPosts.map(card).join('\n    ')}
  </div>
</main>
${footer()}`;
  return head({
    title: hub.name + ' Nails | NailDex',
    description: HUB_BLURBS[hub.slug] || (hub.name + ' nail design collections on NailDex.'),
    canonical: SITE_URL + '/topics/' + hub.slug + '/',
    ogImage: hubPosts[0].coverImage,
  }) + '\n<body>\n' + body;
}

function aboutPage() {
  const body = `${header()}
<main class="narrow">
  <div class="page-head">
    <p class="meta">About</p>
    <h1>What is NailDex?</h1>
  </div>
  <div class="article-body">
    <p>NailDex is a nail inspiration journal. We publish a new design collection every day: real sets on real hands, across shapes, finishes and skin tones. Every design is numbered, so you can screenshot your favorites and show your nail tech exactly what you want, with the exact words to ask for written under each photo.</p>
    <p>Every collection also lives on the NailDex YouTube channel as a full long form video and a set of Shorts, and on Pinterest as a saveable board. Watch a design, save the number, book the appointment. That is the whole idea.</p>
    <p>Start with the newest collection in the <a href="/blog/">inspo journal</a>, or browse by season: ${hubs.map((h) => '<a href="/topics/' + h.slug + '/">' + esc(h.name) + ' nails</a>').join(' and ')}.</p>
  </div>
  <section class="follow-block" aria-label="Follow NailDex">
    <h2>Follow NailDex</h2>
    <p>A new numbered collection lands every day. Follow along so the next set finds you first.</p>
    <div class="follow-links">
      <a class="btn btn-wine" href="${YT_CHANNEL}" rel="noopener" target="_blank">NailDex on YouTube</a>
      <a class="btn btn-outline" href="${PINTEREST}" rel="noopener" target="_blank">NailDex boards on Pinterest</a>
    </div>
  </section>
</main>
${footer()}`;
  return head({
    title: 'About NailDex | Nail Inspiration, Updated Daily',
    description: 'NailDex is a nail inspiration journal: a new numbered design collection every day, on the site, on YouTube and on Pinterest.',
    canonical: SITE_URL + '/about/',
  }) + '\n<body>\n' + body;
}

function notFoundPage() {
  const body = `${header()}
<main class="narrow notfound">
  <h1 class="serif">That page is not here</h1>
  <p>The design you are looking for may have moved. Start from the newest collections instead.</p>
  <p><a class="btn btn-wine" href="/blog/">Open the inspo journal</a></p>
</main>
${footer()}`;
  return head({
    title: 'Page not found | NailDex',
    description: 'That page is not here. Browse the NailDex inspo journal for the newest nail design collections.',
    canonical: SITE_URL + '/404.html',
  }) + '\n<body>\n' + body;
}

// ---- write pages ----
const pages = [];
function writePage(relPath, html) {
  const dest = path.join(ROOT, relPath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, html);
  pages.push(relPath);
  console.log('page:', relPath);
}

writePage('index.html', homePage());
writePage('blog/index.html', blogIndexPage());
for (const post of posts) writePage('blog/' + post.slug + '/index.html', articlePage(post));
for (const hub of hubs) writePage('topics/' + hub.slug + '/index.html', hubPage(hub));
writePage('about/index.html', aboutPage());
writePage('404.html', notFoundPage());

fs.writeFileSync(path.join(ROOT, 'generated-pages.json'), JSON.stringify(pages, null, 2) + '\n');

// ---- sitemap + robots ----
const urls = [
  { loc: '/', lastmod: sorted[0].publishedAt },
  { loc: '/blog/', lastmod: sorted[0].publishedAt },
  { loc: '/about/', lastmod: sorted[0].publishedAt },
  ...hubs.map((h) => ({ loc: '/topics/' + h.slug + '/', lastmod: sorted[0].publishedAt })),
  ...sorted.map((p) => ({ loc: '/blog/' + p.slug + '/', lastmod: p.publishedAt })),
];
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n'
  + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + urls.map((u) => '  <url><loc>' + SITE_URL + u.loc + '</loc><lastmod>' + u.lastmod + '</lastmod></url>').join('\n')
  + '\n</urlset>\n';
fs.writeFileSync(path.join(ROOT, 'public/sitemap.xml'), sitemap);
fs.writeFileSync(path.join(ROOT, 'public/robots.txt'),
  'User-agent: *\nAllow: /\n\nSitemap: ' + SITE_URL + '/sitemap.xml\n');
console.log('sitemap + robots written,', urls.length, 'urls');
