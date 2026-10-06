// Packs unlisted pages into .deploy/temporary-content.bin and rotates the SITE_OVERLAY_KEY secret.
//
//   node scripts/pack-temporary-content.mjs <page-project> [<page-project> ...]
//
// The bundle is rebuilt from scratch every time, so every page that should stay online must be listed:
// a project left out disappears with the next deploy. Each project keeps its own random route in its
// publish.json ({"route":"card-<48 hex>"}), outside this tree, and exports itself through
// tools/export-site.mjs; neither the routes nor the pages ever enter this public tree in clear text.
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,cpSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {randomBytes,createCipheriv} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const REPOSITORY='todor-rusev/vibestaff.bot';
const projects=process.argv.slice(2).map(p=>resolve(p));
if(!projects.length) throw Error('Usage: node scripts/pack-temporary-content.mjs <page-project> [<page-project> ...]');

const scratch=mkdtempSync(join(tmpdir(),'temporary-content-'));
let pages;
try {
 pages=projects.map((project,i)=>{
  const {route}=JSON.parse(readFileSync(join(project,'publish.json'),'utf8'));
  if(typeof route!=='string'||!/^card-[a-f0-9]{48}$/.test(route)) throw Error(`${project}: publish.json needs a route card-<48 hex>`);
  const exported=join(scratch,`${i}.json`);
  execFileSync(process.execPath,[join(project,'tools/export-site.mjs'),exported],{stdio:['ignore','ignore','inherit']});
  const {revision,files}=JSON.parse(readFileSync(exported,'utf8'));
  console.log(`${route}: revision ${revision}, ${files.length} files`);
  return {prefix:route,files};
 });
} finally { rmSync(scratch,{recursive:true,force:true}); }
if(new Set(pages.map(p=>p.prefix)).size!==pages.length) throw Error('Two projects share one route');

const key=randomBytes(32),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
const encrypted=Buffer.concat([cipher.update(gzipSync(JSON.stringify({pages}))),cipher.final()]);
const bundle=join(ROOT,'.deploy/temporary-content.bin');
mkdirSync(dirname(bundle),{recursive:true});
writeFileSync(bundle,Buffer.concat([iv,cipher.getAuthTag(),encrypted]));

// The deploy restores the bundle with the same script; a bundle it would refuse must not rotate the key.
const rehearsal=mkdtempSync(join(tmpdir(),'temporary-restore-'));
try {
 cpSync(join(ROOT,'site'),rehearsal,{recursive:true});
 execFileSync(process.execPath,[join(ROOT,'scripts/restore-temporary-content.mjs'),bundle,rehearsal],
  {env:{...process.env,SITE_OVERLAY_KEY:key.toString('hex')},stdio:['ignore','inherit','inherit']});
} finally { rmSync(rehearsal,{recursive:true,force:true}); }

// The key lives only in the repository secret; the next pack rotates it together with the bundle.
execFileSync('gh',['secret','set','SITE_OVERLAY_KEY','--repo',REPOSITORY],{input:key.toString('hex'),stdio:['pipe','ignore','inherit']});
console.log(`Packed ${pages.length} page(s) into .deploy/temporary-content.bin; SITE_OVERLAY_KEY rotated.`);
