import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname,sep} from 'node:path';
import {createDecipheriv} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const bundle=resolve(process.argv[2] || '.deploy/temporary-content.bin');
const site=resolve(process.argv[3] || 'site');
if(!existsSync(bundle)) process.exit(0);
const key=Buffer.from(process.env.SITE_OVERLAY_KEY || '', 'hex');
if(key.length!==32) throw Error('Temporary content requires SITE_OVERLAY_KEY');
const encrypted=readFileSync(bundle);
const decipher=createDecipheriv('aes-256-gcm',key,encrypted.subarray(0,12));
decipher.setAuthTag(encrypted.subarray(12,28));
const payload=JSON.parse(gunzipSync(Buffer.concat([decipher.update(encrypted.subarray(28)),decipher.final()])));
if(!/^card-[a-f0-9]{48}$/.test(payload.prefix)) throw Error('Invalid temporary route');
const target=resolve(site,payload.prefix);
const seen=new Set();
const prepared=payload.files.map(({path,data})=>{
 if(typeof path!=='string'||!/^([a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+$/.test(path)||path.split('/').some(p=>p==='..')||seen.has(path))throw Error('Invalid temporary file');
 seen.add(path);
 if(!/\.(html|css|js|png|webp)$/.test(path))throw Error('Unexpected temporary file type');
 const destination=resolve(target,path);if(!destination.startsWith(target+sep))throw Error('Path escaped temporary route');
 const bytes=Buffer.from(data,'base64');
 if(/\.(html|css|js)$/.test(path)&&/(?:ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|[A-Za-z]:\\(?:Users|WORK)\\)/.test(bytes.toString('utf8')))throw Error('Private data in temporary content');
 return {path,destination,bytes};
});
const index=prepared.find(f=>f.path==='index.html');
if(!index||!/name="robots" content="noindex, nofollow, noarchive"/.test(index.bytes.toString('utf8')))throw Error('Temporary page must prevent indexing');
for (const file of prepared.filter(f => /\.(html|css|js)$/.test(f.path))) {
 const text = file.bytes.toString('utf8');
 const refs = /\.js$/.test(file.path)
   ? [...text.matchAll(/(?:from\s*|import\s*\()(['"])(\.[^'"]+)\1/g)].map(m=>m[2])
   : [...text.matchAll(/(?:href|src)="([^"#?]+)|url\(['"]?([^'"\)#?]+)/g)].map(m=>m[1]||m[2]);
 for (const ref of refs) {
  if (/^(https?:|data:|mailto:|\/\/)/.test(ref)) continue;
  const local = resolve(dirname(file.destination), ref);
  if (!prepared.some(f=>f.destination===local)) throw Error('Missing temporary page dependency');
 }
}
for(const file of prepared){mkdirSync(dirname(file.destination),{recursive:true});writeFileSync(file.destination,file.bytes);}
console.log('Temporary content restored and validated.');
