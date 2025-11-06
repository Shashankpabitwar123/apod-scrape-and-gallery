/**
 * Scrape https://apod.nasa.gov/apod/archivepixFull.html
 * Build JSON for:
 *  - apod-2025.json (all entries in 2025)
 *  - latest.json (most recent entry)
 *  - last7.json (7 most recent entries)
 *
 * Usage: node tools/scrape_apod.js
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const ARCHIVE_URL = 'https://apod.nasa.gov/apod/archivepixFull.html';
const BASE = 'https://apod.nasa.gov/apod/';

// Fetch helper with small delay to be nice
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));

async function fetchHTML(url){
  const res = await fetch(url, { headers: { 'User-Agent': 'APOD-class-scraper / educational' }});
  if(!res.ok) throw new Error(`Fetch failed ${res.status}: ${url}`);
  return await res.text();
}

/** Parse the archive page: returns [{date,title,href}] */
function parseArchive(html){
  const $ = cheerio.load(html);
  const items = [];
  $('a').each((_,a)=>{
    const href = $(a).attr('href') || '';
    const text = $(a).text().trim();
    // Expect like "2025 January 3 - Title"
    const m = text.match(/^(\d{4})\s+(\w+)\s+(\d{1,2})\s+-\s+(.+)$/);
    if(!m) return;
    const [_, yyyy, monthName, dd, title] = m;
    if(yyyy !== '2025') return;
    const date = new Date(`${monthName} ${dd}, ${yyyy}`);
    if(isNaN(date)) return;
    items.push({
      title, date: date.toISOString().slice(0,10),
      href
    });
  });
  return items;
}

/** For each item, open its page to find media */
async function hydrateItem(item){
  try{
    const html = await fetchHTML(BASE + item.href);
    const $ = cheerio.load(html);
    // Look for <iframe> (YouTube/vimeo) or <img> inside the main content
    let media_type = 'image';
    let url = null, hdurl = null, thumbnail_url = null;

    const iframe = $('iframe[src*="youtube"], iframe[src*="vimeo"]').first();
    if(iframe.length){
      media_type = 'video';
      url = iframe.attr('src');
      // best-effort thumbnail for youtube
      const m = url.match(/embed\/([A-Za-z0-9_-]+)/) || url.match(/[?&]v=([^&]+)/);
      if(m){ thumbnail_url = `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg`; }
    }else{
      const img = $('img').first();
      if(img.length){
        const src = img.attr('src');
        url = src?.startsWith('http') ? src : BASE + src;
        // try to find link to the full res image
        const parentLink = img.parent('a').attr('href');
        if(parentLink){
          const full = parentLink.startsWith('http') ? parentLink : BASE + parentLink;
          hdurl = full;
        }
      }
    }

    // Explanation text
    let explanation = '';
    $('body').find('p').each((_,p)=>{
      const t = $(p).text().trim();
      if(t.length > explanation.length) explanation = t; // crude pick longest paragraph
    });

    return { ...item, media_type, url, hdurl, thumbnail_url, explanation, service_version:'v1' };
  }catch(e){
    console.error('hydrate failed for', item.href, e.message);
    return { ...item, media_type:'unknown', url:null, explanation:'' };
  }finally{
    await sleep(350); // politeness delay
  }
}

async function main(){
  console.log('Fetching archive…');
  const html = await fetchHTML(ARCHIVE_URL);
  const entries = parseArchive(html);
  console.log('Found', entries.length, 'entries in 2025.');

  const hydrated = [];
  for(const it of entries){
    hydrated.push(await hydrateItem(it));
  }

  // Sort newest first
  hydrated.sort((a,b)=> (a.date < b.date ? 1 : -1));

  const dataDir = path.resolve('data');
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(path.join(dataDir,'apod-2025.json'), JSON.stringify(hydrated, null, 2));

  // latest and last7
  if(hydrated.length){
    await fs.writeFile(path.join(dataDir,'latest.json'), JSON.stringify([hydrated[0]], null, 2));
    await fs.writeFile(path.join(dataDir,'last7.json'), JSON.stringify(hydrated.slice(0,7), null, 2));
  }
  console.log('Done. Wrote data/apod-2025.json, latest.json, last7.json');
}

main().catch(e=>{ console.error(e); process.exit(1); });
