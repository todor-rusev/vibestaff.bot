import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {it} from 'node:test';
const source=readFileSync(new URL('../site/assets/download.js',import.meta.url),'utf8');
const store='https://apps.microsoft.com/detail/9n1gg0g88csj';
const flush=async()=>{for(let i=0;i<4;i++)await new Promise(resolve=>setImmediate(resolve));};
function node(){return{href:'',textContent:'',innerHTML:'',hidden:true,dataset:{},classList:{add(){},remove(){}},setAttribute(){},removeAttribute(){}};}
function fixture({get,fetcher}={}){
  const cards=['windows','mac'].map(system=>({dataset:{system},classList:{add(){}},fields:{button:node(),aside:node(),alt:node(),yours:node()},
    querySelector(selector){return this.fields[/data-role="([^"]+)"/.exec(selector)?.[1]];},querySelectorAll(){return[];}}));
  const line=node(),link=node(),state=node(),location={href:'initial'},requests=[];
  const doc={body:{dataset:get?{get}:{}},querySelectorAll:selector=>selector==='[data-system]'?cards:[],querySelector:selector=>selector.includes('release-line')?line:selector.includes('state')?state:selector.includes('link')?link:null};
  runInNewContext(source,{document:doc,location,navigator:{userAgent:'Windows',platform:'Win32'},sessionStorage:{getItem(){return null;},setItem(){}},
    fetch:async(...args)=>{requests.push(args);return fetcher?fetcher(...args):{ok:true,json:async()=>({tag_name:'v1',assets:[]})};},setTimeout});
  return{cards,line,link,state,location,requests};
}
it('the Store card is usable while release lookup is still pending',()=>{
  const f=fixture({fetcher:()=>new Promise(()=>{})});assert.equal(f.cards[0].fields.button.href,store);
});
for(const failed of [false,true])it(`Store stays primary when GitHub ${failed?'fails':'has no Windows installer'}`,async()=>{
  const f=fixture({fetcher:()=>failed?Promise.reject(new Error('offline')):Promise.resolve({ok:true,json:async()=>({tag_name:'v1',assets:[]})})});await flush();
  assert.equal(f.cards[0].fields.button.href,store);assert.equal(f.cards[0].fields.button.textContent,'Download from the Microsoft Store');
  assert.notEqual(f.cards[1].fields.button.href,store);assert.doesNotMatch(f.line.textContent,/desktop package is on its way/);
});
it('the direct EXE remains secondary, with the warning hook',async()=>{
  const f=fixture({fetcher:async()=>({ok:true,json:async()=>({tag_name:'v1',assets:[{name:'viberoom-1-windows-x64.exe',browser_download_url:'https://example.invalid/installer.exe',size:100*1024*1024}]})})});await flush();
  assert.equal(f.cards[0].fields.button.href,store);assert.match(f.cards[0].fields.aside.innerHTML,/data-exe-note/);assert.match(f.cards[0].fields.aside.innerHTML,/download it from here/);
});
it('/get/windows goes to Store without requesting GitHub',async()=>{
  const f=fixture({get:'windows',fetcher:()=>new Promise(()=>{})});await flush();assert.equal(f.location.href,store);assert.equal(f.link.href,store);assert.equal(f.requests.length,0);
});
