const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
globalThis.crypto ??= webcrypto;
const p=require('../web/picker.js');
const changedBy=(a,b)=>a.filter(n=>!b.includes(n)).length;
for(const count of [6,7,8])for(const max of [55,58])for(const style of ['lucky','model','low','high','balanced','creative'])for(const locks of [[],[1,max],Array.from({length:count},(_,i)=>i+1)])for(let i=0;i<10;i++){
 const ticket=p.generate(max,style,locks,[3,9,17,24,41,52],count);
 assert.equal(ticket.length,count);assert.equal(new Set(ticket).size,count);assert(ticket.every(n=>n>=1&&n<=max));assert(locks.every(n=>ticket.includes(n)));
 if(style==='low')assert(ticket.filter(n=>!locks.includes(n)).every(n=>n<=Math.floor(max/2)));
 if(style==='high')assert(ticket.filter(n=>!locks.includes(n)).every(n=>n>Math.floor(max/2)));
 const ideas=p.suggestions(ticket,max,locks);
 assert.equal(ideas.length===0,locks.length===count);assert(ideas.length<=3);assert.equal(new Set(ideas.map(s=>s.numbers.join())).size,ideas.length);
 for(const idea of ideas){assert.equal(idea.numbers.length,count);assert.equal(new Set(idea.numbers).size,count);assert(idea.numbers.every(n=>n>=1&&n<=max));assert(locks.every(n=>idea.numbers.includes(n)));assert.equal(changedBy(ticket,idea.numbers),1);}
}
// Suggestion aims: dates moves a number above 31, spread widens the closest gap.
const dated=p.suggestions([1,2,3,10,20,30],58,[]);
assert(dated.find(s=>s.id==='dates').numbers.filter(n=>n<=31).length===5);
const spread=dated.find(s=>s.id==='spread');assert(Math.min(...spread.numbers.slice(1).map((n,i)=>n-spread.numbers[i]))>1);
assert(!p.suggestions([5,15,25,35,45,55],58,[]).some(s=>s.id==='dates'||s.id==='spread'));
assert.equal(p.comb(55,6),28989675);assert.equal(p.comb(58,6),40475358);assert.equal(p.comb(8,6),28);
assert.equal(p.sumPercentile([1,2,3,4,5,6],55,500),0);assert.equal(p.sumPercentile([50,51,52,53,54,55],55,500),100);
assert.deepEqual([[1,2,3,4],[1,1,2,3],[1,1,2,2],[1,1,1,2],[7,7,7,7]].map(p.permutations),[24,12,6,4,1]);
// 4D digits may repeat, locks are positions, and a 4D Jackpot pair must be two different numbers.
for(const length of [4,8])for(const style of ['lucky','model','low','high','balanced','creative'])for(const locks of [[],[0],[1,2,3]])for(let i=0;i<15;i++){
 const current=[7,7,0,1,2,3,4,5];const digits=p.generateDigits(length,style,locks,current);
 assert.equal(digits.length,length);assert(digits.every(d=>Number.isInteger(d)&&d>=0&&d<=9));assert(locks.every(i=>digits[i]===current[i]));assert(p.distinctPair(digits));
 if(style==='low'||style==='high')assert(digits.filter((_,i)=>!locks.includes(i)).every(d=>style==='low'?d<=4:d>=5));
 for(const idea of p.digitSuggestions(digits,locks)){assert.equal(idea.numbers.filter((d,i)=>d!==digits[i]).length,1);assert(locks.every(i=>idea.numbers[i]===digits[i]));assert(p.distinctPair(idea.numbers));}
}
assert.equal(p.distinctPair([1,2,3,4,1,2,3,4]),false);
assert.deepEqual(p.digitSuggestions([1,2,3,4,1,2,3,5],[0,1,2,3,4,5,6]).map(s=>s.numbers[7]).includes(4),false);
const repeated=p.digitSuggestions([7,7,7,7],[]);assert(repeated.some(s=>s.id==='repeats'));assert(repeated.some(s=>s.id==='arrangements'));
assert(!p.digitSuggestions([1,2,3,4],[]).some(s=>s.id==='repeats'||s.id==='arrangements'));
assert.deepEqual(p.digitSuggestions([1,2,3,4],[0,1,2,3]),[]);

const html=fs.readFileSync('web/index.html','utf8');
const nodes=new Map([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],{value:'',innerHTML:'',textContent:'',disabled:false}]));
assert(!nodes.has('challenge')&&!nodes.has('support'));
let stored='[]';
let phone='';
const storage={getItem:key=>key==='toto-whatsapp'?phone:stored,setItem:(key,value)=>{if(key==='toto-whatsapp')phone=value;else stored=value;},removeItem:()=>{phone='';}};
let confirmAnswer=true;
const ctx=vm.createContext({localStorage:storage,Picker:p,document:{getElementById:id=>{assert(nodes.has(id),id);return nodes.get(id);}},confirm:()=>confirmAnswer,navigator:{clipboard:{writeText:async()=>{}}},fetch:async()=>({ok:true,json:async()=>({ticket:[3,9,17,24,41,52],draws:51,after:'2026-09-23'})})});
vm.runInContext(fs.readFileSync('web/app.js','utf8'),ctx);
const read=expr=>JSON.parse(vm.runInContext(`JSON.stringify(${expr})`,ctx));
const click=(id,key,value)=>nodes.get(id).onclick({target:{closest:()=>({dataset:{[key]:String(value)},disabled:false})}});
const row=(id,action)=>nodes.get('selections').onclick({target:{closest:()=>({dataset:{entry:String(id),action}})}});
const useIdea=i=>click('suggestions','suggestion',i);
(async()=>{
 assert.equal((nodes.get('board').innerHTML.match(/data-number=/g)||[]).length,58);
 for(const n of [1,2,3,4,5,58])click('board','number',n);
 click('board','number',7);assert.equal(read('selected').length,6);
 // Completing or generating a set does not save it; Add to list does, once.
 assert.equal(read('entries.length'),0);assert.equal(nodes.get('add').disabled,false);
 click('ticket','lock',58);assert.deepEqual(read('locks'),[58]);
 nodes.get('game').value='55';nodes.get('game').onchange();assert.equal(read('selected').length,5);assert.deepEqual(read('locks'),[]);
 nodes.get('undo').onclick();assert.equal(read('max'),58);assert.deepEqual(read('locks'),[58]);
 await nodes.get('generate').onclick();assert(read('selected').includes(58));assert.equal(read('entries.length'),0);
 // Refine shows insights and suggestions without changing the numbers; using one changes a single unlocked number.
 const before=read('selected');nodes.get('refine').onclick();assert.deepEqual(read('selected'),before);
 const insight=nodes.get('review-body').innerHTML;for(const label of ['Balance','Total','Spacing','Spread','Shared prize','Odds'])assert(insight.includes(`<strong>${label}</strong>`),label);
 assert(insight.includes('1 in 40,475,358'));assert(!/NaN|undefined/.test(insight+nodes.get('suggestions').innerHTML));
 const ideas=read('ideas');assert(ideas.length>=1&&ideas.length<=3);assert.equal((nodes.get('suggestions').innerHTML.match(/data-suggestion=/g)||[]).length,ideas.length);
 useIdea(0);assert.deepEqual(read('selected'),ideas[0].numbers);assert.equal(changedBy(before,read('selected')),1);assert(read('selected').includes(58));assert.equal(read('entries.length'),0);
 nodes.get('undo').onclick();assert.deepEqual(read('selected'),before);assert.equal(read('ideas.length'),0);
 nodes.get('game').value='55';nodes.get('game').onchange();click('styles','style','model');await nodes.get('generate').onclick();assert(nodes.get('review-body').textContent.includes('51 supplied draws'));
 for(const n of read('selected'))click('ticket','lock',n);assert.equal(nodes.get('generate').disabled,true);assert.equal(nodes.get('refine').disabled,false);
 nodes.get('refine').onclick();assert.equal(read('ideas.length'),0);assert(nodes.get('suggestions').innerHTML.includes('locked'));
 nodes.get('clear').onclick();assert.equal(read('selected').length,0);assert(nodes.get('copy').disabled);assert(nodes.get('refine').disabled);assert(nodes.get('add').disabled);
 ctx.fetch=async()=>{throw Error('Network unavailable')};vm.runInContext('model=null',ctx);await nodes.get('generate').onclick();assert.equal(nodes.get('status').textContent,'Network unavailable');assert.equal(nodes.get('generate').disabled,false);
 ctx.fetch=async()=>({ok:true,json:async()=>({ticket:[3,9,17,24,41,52],draws:51,after:'2026-09-23'})});
 vm.runInContext("entries=[];selected=[];locks=[];style='lucky';max=58;previous=null;render()",ctx);
 assert.equal(nodes.get('whatsapp').hidden,true);
 await nodes.get('generate').onclick();assert.equal(read('entries.length'),0);
 nodes.get('add').onclick();assert.equal(read('entries.length'),1);assert.equal(nodes.get('add').disabled,true);assert.equal(nodes.get('add').title,'Already in your list');assert(nodes.get('add').className.includes('in-list'));
 nodes.get('add').onclick();assert.equal(read('entries.length'),1);
 const first=read('entries[0]');assert.deepEqual(first.numbers,read('selected'));
 nodes.get('refine').onclick();useIdea(0);assert.equal(read('entries.length'),1);assert.equal(nodes.get('add').disabled,false);
 nodes.get('add').onclick();assert.equal(read('entries.length'),2);assert.deepEqual(read('entries[0].numbers'),first.numbers);
 row(first.id,'select');assert.deepEqual(read('selected'),first.numbers);
 row(first.id,'refine');assert.deepEqual(read('selected'),first.numbers);assert(nodes.get('review-title').textContent.includes(first.numbers.map(n=>String(n).padStart(2,'0')).join(' ')));
 row(first.id,'final');assert.equal(nodes.get('whatsapp').hidden,true);
 nodes.get('whatsapp-number').value='invalid';nodes.get('save-whatsapp').onclick();assert.equal(phone,'');
 nodes.get('whatsapp-number').value='+1 202 555 0100';nodes.get('save-whatsapp').onclick();assert.equal(phone,'12025550100');assert.equal(nodes.get('whatsapp').hidden,false);
 const url=new URL(nodes.get('whatsapp').href);
 assert.equal(url.hostname,'wa.me');assert.equal(url.pathname,'/12025550100');
 assert.equal(url.searchParams.get('text'),nodes.get('message-preview').textContent);
 assert.equal(url.searchParams.get('text'),`6/58 - System 6\n${first.numbers.map(n=>String(n).padStart(2,'0')).join(' ')}`);
 row(first.id,'delete');assert.equal(nodes.get('whatsapp').hidden,true);assert(!read('entries').some(e=>e.id===first.id));assert.deepEqual(read('selected'),first.numbers);
 nodes.get('undo').onclick();assert.equal(nodes.get('whatsapp').hidden,false);assert(read('entries').some(e=>e.id===first.id));
 row(first.id,'final');assert.equal(nodes.get('whatsapp').hidden,true);
 assert.deepEqual(JSON.parse(stored),read('entries'));
 for(const count of [7,8]){
  nodes.get('system').value=String(count);nodes.get('system').onchange();
  assert.equal(read('selected.length'),0);
  for(let n=1;n<=count+1;n++)click('board','number',n);
  assert.equal(read('selected.length'),count);
  await nodes.get('generate').onclick();assert.equal(read('selected.length'),count);
  nodes.get('refine').onclick();assert(nodes.get('review-body').innerHTML.includes(`System ${count} plays ${p.comb(count,6)} six-number combinations`));
  nodes.get('add').onclick();
  const savedSet=read('entries.at(-1)');assert.deepEqual(savedSet.numbers,read('selected'));
  row(savedSet.id,'final');
  const preview=nodes.get('message-preview').textContent;
  assert(preview.includes(`6/${savedSet.max} - System ${count}\n${savedSet.numbers.map(n=>String(n).padStart(2,'0')).join(' ')}`));
  assert(!preview.includes('·'));
  nodes.get('system').value='6';nodes.get('system').onchange();
  nodes.get('undo').onclick();assert.equal(read('count'),count);
  nodes.get('system').value='6';nodes.get('system').onchange();
  row(savedSet.id,'select');assert.equal(read('count'),count);assert.equal(nodes.get('system').value,String(count));
 }
 vm.runInContext("entries=entries.filter(e=>!e.final);render()",ctx);
 nodes.get('game').value='4d';nodes.get('game').onchange();
 assert.equal(read('count'),4);assert.equal(nodes.get('system').disabled,true);assert.equal((nodes.get('board').innerHTML.match(/data-number=/g)||[]).length,11);
 for(const d of [0,0,7,9,5])click('board','number',d);assert.deepEqual(read('selected'),[0,0,7,9]);
 click('board','number',-1);assert.deepEqual(read('selected'),[0,0,7]);click('board','number',9);
 nodes.get('add').onclick();const fourD=read('entries.at(-1)');assert.equal(fourD.game,'4d');assert.equal(fourD.max,undefined);
 click('ticket','lock',1);assert.deepEqual(read('locks'),[1]);
 nodes.get('refine').onclick();const digitInsight=nodes.get('review-body').innerHTML;
 assert(digitInsight.includes('<strong>0079</strong>'));assert(digitInsight.includes('12 different arrangements'));assert(digitInsight.includes('1 in 10,000'));
 assert(read('ideas').some(s=>s.id==='repeats'));useIdea(0);assert.equal(read('selected[1]'),0);assert.equal(read('selected').filter((d,i)=>d!==[0,0,7,9][i]).length,1);
 row(fourD.id,'final');assert(nodes.get('message-preview').textContent.includes('4D\n0 0 7 9'));
 nodes.get('game').value='4dj';nodes.get('game').onchange();assert.equal(read('count'),8);assert.equal(read('selected.length'),0);
 for(const d of [1,2,3,4,1,2,3])click('board','number',d);click('board','number',4);assert.equal(read('selected.length'),7);assert(nodes.get('status').textContent.includes('different'));
 click('board','number',5);nodes.get('refine').onclick();assert(nodes.get('review-body').innerHTML.includes('share 3 digits'));assert(nodes.get('review-body').innerHTML.includes('16,665,000'));
 await nodes.get('generate').onclick();const pair=read('selected');assert.equal(pair.length,8);assert(p.distinctPair(pair));
 nodes.get('add').onclick();const jackpot=read('entries.at(-1)');row(jackpot.id,'final');
 assert(nodes.get('message-preview').textContent.includes(`4D Jackpot\n${pair.slice(0,4).join(' ')} - ${pair.slice(4).join(' ')}`));
 nodes.get('game').value='58';nodes.get('game').onchange();assert.equal(read('count'),6);assert.equal(read('digitGame'),null);assert.equal(nodes.get('system').disabled,false);
 nodes.get('undo').onclick();assert.equal(read('digitGame'),'4dj');assert.deepEqual(read('selected'),pair);
 row(fourD.id,'select');assert.equal(read('digitGame'),'4d');assert.equal(read('count'),4);
 const grouped=[{game:'4dj',numbers:[1,2,3,4,5,6,7,8]},{game:'58',max:58,numbers:[1,2,3,4,5,6]},{game:'55',max:55,numbers:[3,9,17,24,41,52]},{game:'4d',numbers:[0,0,7,9]},{game:'55',max:55,numbers:[1,2,3,4,5,6]},{game:'55',max:55,numbers:[1,2,3,4,5,6,7]}];
 assert.equal(vm.runInContext(`messageText(${JSON.stringify(grouped)})`,ctx),'6/55 - System 6\n03 09 17 24 41 52\n01 02 03 04 05 06\n\n6/55 - System 7\n01 02 03 04 05 06 07\n\n6/58 - System 6\n01 02 03 04 05 06\n\n4D\n0 0 7 9\n\n4D Jackpot\n1 2 3 4 - 5 6 7 8');
 const savedBefore=read('entries.length');confirmAnswer=false;nodes.get('delete-all').onclick();assert.equal(read('entries.length'),savedBefore);
 confirmAnswer=true;nodes.get('delete-all').onclick();assert.equal(read('entries.length'),0);assert.equal(nodes.get('delete-all').disabled,true);assert.equal(nodes.get('whatsapp').hidden,true);
 nodes.get('undo').onclick();assert.equal(read('entries.length'),savedBefore);
 // Reload checks rebind the shared fake DOM handlers to new contexts, so they run last.
 const reloaded=vm.createContext({localStorage:storage,Picker:p,document:{getElementById:id=>nodes.get(id)}});
 vm.runInContext(fs.readFileSync('web/app.js','utf8'),reloaded);
 assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(entries.map(e=>[e.game,e.numbers,e.final]))',reloaded)),read('entries.map(e=>[e.game,e.numbers,e.final])'));
 assert.equal(vm.runInContext('whatsappNumber',reloaded),'12025550100');
 nodes.get('forget-whatsapp').onclick();assert.equal(phone,'');assert.equal(nodes.get('whatsapp').hidden,true);assert.equal(nodes.get('whatsapp').href,'');
 console.log('Algorithm checks passed: 2,160 generation and suggestion cases, suggestion aims, odds, sum percentiles, 4D arrangements.');
 console.log('Picker checks passed: manual entry, locks, game switch, undo, explicit Add to list, Refine insights and suggestions, model load and errors.');
 console.log('Saved-list checks passed: add, select, refine, lock in, delete, delete all with confirmation, undo, persistence, WhatsApp format and destination.');
 console.log('4D checks passed: keypad entry, delete, position locks, distinct jackpot pairs, digit insights, messages, game switching.');
})().catch(e=>{console.error(e);process.exitCode=1;});
