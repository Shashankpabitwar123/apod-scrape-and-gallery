// Frontend for APOD gallery using scraped JSON files
const SOURCES = {
  all2025: 'data/apod-2025.json',
  latest: 'data/latest.json',
  last7: 'data/last7.json'
};

const startEl = document.getElementById('startDate');
const endEl   = document.getElementById('endDate');
const gallery = document.getElementById('gallery');
const status  = document.getElementById('status');
const factEl  = document.getElementById('fact');

document.getElementById('btnFetch').addEventListener('click', () => loadFrom('all2025', true));
document.getElementById('btnLatest').addEventListener('click', () => loadFrom('latest'));
document.getElementById('btnLast7').addEventListener('click', () => loadFrom('last7'));

const FACTS = [
  'A day on Venus is longer than its year.',
  'There are more stars in the universe than grains of sand on Earth (by a lot).',
  'The Hubble Space Telescope has orbited Earth over 180,000 times.',
  'A teaspoon of a neutron star would weigh about a billion tons.',
  'Mars has the largest volcano in the solar system: Olympus Mons.',
  'Jupiter has 95+ confirmed moons.',
  'The observable universe is about 93 billion light-years across.',
  'Saturn would float in water (if you had an ocean big enough).',
  'The “Pillars of Creation” are inside the Eagle Nebula, ~7,000 ly away.',
  'The Sun makes up 99.8% of the Solar System’s mass.',
  'Spacesuits are custom-made and can cost millions of dollars.',
  'The coldest place in the universe we’ve found is the Boomerang Nebula (~1 K).',
  'A year on Mercury is just 88 Earth days.',
  'Some APOD entries are videos—look for the play button!',
  'The Milky Way and Andromeda galaxies will collide in ~4.5 billion years.'
];
function randomFact(){ factEl.textContent = '🛰️ Did you know? ' + FACTS[Math.floor(Math.random()*FACTS.length)]; }

function toNum(d){ return Number(d.replaceAll('-','')); }

function makeCard(item){
  const isVideo = item.media_type === 'video';
  const card = document.createElement('article');
  card.className = 'card';

  const thumbWrap = document.createElement('div');
  thumbWrap.className = 'thumb-wrap';

  if(isVideo){
    const img = document.createElement('img');
    img.src = item.thumbnail_url || 'img/nasa-worm-logo.png';
    img.alt = (item.title || 'APOD') + ' (Video thumbnail)';
    img.className = 'thumb';
    thumbWrap.appendChild(img);
  } else {
    const img = document.createElement('img');
    img.src = item.url;
    img.alt = item.title || 'APOD image';
    img.loading = 'lazy';
    img.className = 'thumb';
    thumbWrap.appendChild(img);
  }

  const meta = document.createElement('div');
  meta.className = 'meta';
  const h3 = document.createElement('h3');
  h3.textContent = item.title || '(Untitled)';
  const d = document.createElement('p');
  d.className = 'date';
  d.textContent = new Date(item.date).toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'});
  meta.appendChild(h3); meta.appendChild(d);

  card.appendChild(thumbWrap); card.appendChild(meta);
  card.addEventListener('click', () => openModal(item));
  return card;
}

const modal = document.getElementById('modal');
const modalClose = document.getElementById('modalClose');
const modalMedia = document.getElementById('modalMedia');
const modalTitle = document.getElementById('modalTitle');
const modalDate  = document.getElementById('modalDate');
const modalText  = document.getElementById('modalText');

function openModal(item){
  modalTitle.textContent = item.title || '(Untitled)';
  modalDate.textContent = new Date(item.date).toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'});
  modalText.textContent = item.explanation || '';

  modalMedia.innerHTML = '';
  if(item.media_type === 'video'){
    const iframe = document.createElement('iframe');
    iframe.src = item.url;
    iframe.setAttribute('allowfullscreen','');
    iframe.style.border='0';
    modalMedia.appendChild(iframe);
  } else {
    const img = document.createElement('img');
    img.src = item.hdurl || item.url;
    modalMedia.appendChild(img);
  }
  modal.hidden = false;
}
modal.addEventListener('click', e => { if(e.target===modal) modal.hidden = true; });
document.getElementById('modalClose').addEventListener('click', () => modal.hidden = true);
document.addEventListener('keydown', e => { if(e.key==='Escape' && !modal.hidden) modal.hidden = true; });

async function loadFrom(which, withFilter=false){
  randomFact();
  status.textContent = '🔄 Loading space photos…';
  gallery.innerHTML = '';
  try{
    const res = await fetch(SOURCES[which] + '?v=' + Date.now(), {cache:'no-store'});
    const data = await res.json();
    let items = data;

    if(withFilter){
      const sVal = startEl.value, eVal = endEl.value;
      if(sVal || eVal){
        const s = sVal ? toNum(sVal) : 0;
        const e = eVal ? toNum(eVal) : 99999999;
        items = items.filter(x => { const dn = toNum(x.date); return dn>=s && dn<=e; });
      }
    }

    // newest first
    items.sort((a,b) => toNum(b.date) - toNum(a.date));

    if(!items.length){ status.textContent = 'No results for that range.'; return; }
    const frag = document.createDocumentFragment();
    items.forEach(it => frag.appendChild(makeCard(it)));
    gallery.appendChild(frag);
    status.textContent = '';
  }catch(e){
    console.error(e);
    status.textContent = 'Could not load local JSON. Did the scraper run?';
  }
}

// default view
randomFact();
// Tip: run scraper to generate data/*.json, then these buttons will work.
