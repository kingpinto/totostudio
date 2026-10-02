const $=id=>document.getElementById(id);
const styles=[['lucky','✦','Feeling lucky','A fresh random set. Every available number gets an equal chance; locked numbers stay.'],['model','⌘','Model based',''],['low','↙','Low numbers','Explore the lower half of the board. Locked favorites can sit outside this range.'],['high','↗','High numbers','Explore the upper half of the board. Locked favorites can sit outside this range.'],['balanced','◒','Balanced','Look for an even mix of odd and even numbers, and a spread across both halves. Locks may limit the balance.'],['creative','〰','Creative series','Play with evenly spaced sequences. With locks, explore a repeating-step pattern.']];
let count=6,max=58,style='lucky',selected=[],locks=[],previous=null,model=null,busy=false,revision=0;
let entries=[],activeId=null,nextId=1,whatsappNumber='';
function normalizePhone(value){const number=value.replace(/[\s()+-]/g,'');return /^[1-9][0-9]{7,14}$/.test(number)?number:'';}
try{whatsappNumber=normalizePhone(localStorage.getItem('toto-whatsapp')||'');}catch{}

try {
 const saved=JSON.parse(localStorage.getItem('toto-selections')||'[]');
 if(Array.isArray(saved)) entries=saved.filter(e=>e&&[55,58].includes(e.max)&&Array.isArray(e.numbers)&&[6,7,8].includes(e.numbers.length)&&new Set(e.numbers).size===e.numbers.length&&e.numbers.every(n=>Number.isInteger(n)&&n>=1&&n<=e.max)).map(e=>({id:nextId++,max:e.max,numbers:e.numbers,style:styles.some(s=>s[0]===e.style)?e.style:'lucky',final:e.final===true}));
} catch {}
function saveEntries(){try{localStorage.setItem('toto-selections',JSON.stringify(entries));}catch{notice('Browser storage is unavailable. Keep this page open to retain your list.');}}
function rememberSelection(){
 if(selected.length!==count){activeId=null;return;}
 let entry=entries.find(e=>e.max===max&&e.numbers.join(',')===selected.join(','));
 if(!entry){entry={id:nextId++,max,numbers:[...selected],style,final:false};entries.push(entry);}
 activeId=entry.id;saveEntries();
}
function renderEntries(){
 $('saved-count').textContent=`${entries.length} saved`;
 $('selections').innerHTML=entries.length?entries.map(e=>`<div class="saved-row ${e.id===activeId?'active':''}"><button class="select-set" data-entry="${e.id}" data-action="select" aria-pressed="${e.id===activeId}"><small>6/${e.max} · ${systemLabel(e.numbers.length)} · ${styles.find(s=>s[0]===e.style)[2]}${e.final?' · Locked in':''}</small><strong>${e.numbers.map(n=>String(n).padStart(2,'0')).join(' · ')}</strong></button><div class="row-actions">${[['refine','Refine'],['challenge','Challenge'],['support','Support'],['final',e.final?'Unlock set':'Lock in'],['delete','Delete']].map(([action,label])=>`<button data-entry="${e.id}" data-action="${action}" ${busy?'disabled':''}>${label}</button>`).join('')}</div></div>`).join(''):'<p class="hint">Generate a set or complete a set to start your list.</p>';
 const finalized=entries.filter(e=>e.final);
 const message='My locked-in Toto selections\n'+finalized.map(e=>`6/${e.max}: ${e.numbers.map(n=>String(n).padStart(2,'0')).join(' · ')}`).join('\n');
 $('message-preview').textContent=finalized.length?message:'Lock in a set above to prepare your message.';
 $('whatsapp').hidden=!finalized.length||!whatsappNumber;
 $('whatsapp').href=finalized.length&&whatsappNumber?`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`:'';
}
function systemLabel(size){return size===6?'Standard 6':`System ${size}`;}
function notice(text){$('status').textContent=text;}
function modelNote(){return max===55?'Uses the existing rank-ensemble model and supplied 6/55 history. Historical patterns are not winning probabilities.':'No 6/58 draw history is supplied. This pattern model scores odd/even balance, low/high balance, sum, and spacing.';}
function snapshot(){previous={count,max,selected:[...selected],locks:[...locks],entries:entries.map(e=>({...e,numbers:[...e.numbers]})),activeId};revision++;}
function resetReview(){$('review-title').textContent='Make a selection. Explore the shape.';$('review-body').textContent='Complete a set to see their balance, challenge their patterns, or refine the set while keeping your favorites locked.';}
function render(){
renderEntries();$('system').value=String(count);$('pick-hint').textContent=`Tap to pick or remove a number. Choose up to ${count}.`;$('selection-title').textContent=`Your ${count} possibilities.`;$('game').value=String(max);$('count').textContent=`${selected.length} / ${count} selected`;
$('board').innerHTML=Picker.range(58).map(n=>`<button class="number ${selected.includes(n)?'selected':''} ${locks.includes(n)?'locked':''}" data-number="${n}" aria-label="Number ${n}${locks.includes(n)?', locked':''}${n>max?', unavailable for 6/55':''}" aria-pressed="${selected.includes(n)}" ${n>max?'disabled':''}>${String(n).padStart(2,'0')}</button>`).join('');
$('styles').innerHTML=styles.map(([id,icon,label])=>`<button class="style ${style===id?'active':''}" data-style="${id}" aria-pressed="${style===id}"><span aria-hidden="true">${icon}</span><strong>${label}</strong></button>`).join('');
$('style-note').textContent=style==='model'?modelNote():styles.find(s=>s[0]===style)[3];
$('ticket').innerHTML=Array.from({length:count},(_,i)=>{const n=selected[i];return n?`<button class="ball ${locks.includes(n)?'locked':''}" data-lock="${n}" aria-label="${locks.includes(n)?'Unlock':'Lock'} number ${n}" aria-pressed="${locks.includes(n)}">${String(n).padStart(2,'0')}${locks.includes(n)?'<small>LOCKED</small>':''}</button>`:'<span class="ball empty" aria-label="Empty slot">·</span>';}).join('');
const s=Picker.stats(selected,max);$('metrics').innerHTML=selected.length?`<span>${s.odd} odd / ${selected.length-s.odd} even</span><span>${s.low} low / ${selected.length-s.low} high</span><span>Sum ${s.sum}</span>`:'';
for(const id of ['refine','challenge','support','copy'])$(id).disabled=selected.length!==count||busy;
$('refine').disabled=selected.length!==count||locks.length===count||busy;$('generate').disabled=locks.length===count||busy;$('generate').innerHTML=busy?'Finding your numbers…':`Generate my ${count} <span>↗</span>`;$('undo').disabled=!previous||busy;
}
$('board').onclick=e=>{const b=e.target.closest('[data-number]');if(!b||b.disabled)return;const n=Number(b.dataset.number);if(!selected.includes(n)&&selected.length===count){notice('Your set is full. Remove a number first, or generate a new set.');return;}snapshot();if(selected.includes(n)){selected=selected.filter(x=>x!==n);locks=locks.filter(x=>x!==n);}else selected.push(n);selected.sort((a,b)=>a-b);rememberSelection();resetReview();notice(`${selected.length} of ${count} selected.`);render();};
$('ticket').onclick=e=>{const b=e.target.closest('[data-lock]');if(!b)return;const n=Number(b.dataset.lock);snapshot();locks=locks.includes(n)?locks.filter(x=>x!==n):[...locks,n];notice(`${n} ${locks.includes(n)?'locked':'unlocked'}. ${locks.length===count?'Unlock a number to generate or refine.':''}`);render();};
$('styles').onclick=e=>{const b=e.target.closest('[data-style]');if(b){style=b.dataset.style;revision++;render();}};
$('game').onchange=()=>{snapshot();activeId=null;max=Number($('game').value);const removed=selected.filter(n=>n>max);selected=selected.filter(n=>n<=max);locks=locks.filter(n=>n<=max);resetReview();notice(removed.length?`Switched to 6/${max}. Removed out-of-range numbers: ${removed.join(', ')}.`:`Switched to 6/${max}.`);render();};
$('system').onchange=()=>{snapshot();count=Number($('system').value);selected=[];locks=[];activeId=null;resetReview();notice(`${systemLabel(count)} selected. Choose or generate ${count} numbers. Your saved sets are kept.`);render();};
$('clear').onclick=()=>{snapshot();selected=[];locks=[];activeId=null;resetReview();notice('Selection cleared.');render();};
$('undo').onclick=()=>{if(!previous)return;const old=previous;previous=null;count=old.count;max=old.max;selected=old.selected;locks=old.locks;entries=old.entries;activeId=old.activeId;saveEntries();revision++;resetReview();notice('Last change undone.');render();};
async function getModel(){if(model)return model;const response=await fetch('/api/model');if(!response.ok)throw Error('The historical model could not load. Check the Python server or choose another style.');const data=await response.json();if(!Array.isArray(data.ticket)||data.ticket.length!==6||new Set(data.ticket).size!==6||data.ticket.some(n=>!Number.isInteger(n)||n<1||n>55))throw Error('The historical model returned invalid numbers.');model=data;return data;}
async function changeNumbers(refining){const version=revision;busy=true;render();try{const data=style==='model'&&max===55?await getModel():null;if(version!==revision){notice('Selection changed while loading. Try again with your current settings.');return;}snapshot();const before=[...selected];selected=refining?Picker.refine(selected,max,locks,style,data?.ticket):Picker.generate(max,style,locks,data?.ticket,count);rememberSelection();const source=data?`Historical ensemble: ${data.draws} supplied draws through ${data.after}. The source is not live or independently verified.`:style==='model'?modelNote():styles.find(s=>s[0]===style)[3];$('review-title').textContent=refining?'A small shift. A fresh perspective.':`Your ${count} numbers are ready.`;$('review-body').textContent=refining?`Replaced ${before.filter(n=>!selected.includes(n)).join(', ')} with ${selected.filter(n=>!before.includes(n)).join(', ')}. Locked numbers stayed. Refinement follows your selected style; it does not improve draw odds.\n${source}`:source;notice(refining?'Added a refined option. Your original set is still in the list.':'Added a set to your list. Select any saved set to explore it.');}catch(error){notice(error.message);}finally{busy=false;render();}}
$('generate').onclick=()=>changeNumbers(false);$('refine').onclick=()=>changeNumbers(true);
function review(challenge){const s=Picker.stats(selected,max),half=Math.floor(max/2);$('review-title').textContent=challenge?'Challenge the pattern.':'What supports this selection?';const observations=challenge?[Math.abs(s.odd-count/2)>=2?`Your set leans ${s.odd>count/2?'odd':'even'} (${s.odd} odd, ${count-s.odd} even).`:'Odd and even numbers are reasonably mixed.',Math.abs(s.low-count/2)>=2?`Most numbers sit in the ${s.low>count/2?'lower':'upper'} half.`:'The set reaches into both halves.',s.adjacent?`${s.adjacent} neighboring pair${s.adjacent===1?'':'s'} appear. Would you prefer more spacing?`:'There are no consecutive numbers. Would you prefer a less uniform shape?','Try refining an unlocked number if you want a different shape. None of these patterns makes this set less likely to be drawn.']:[`All ${count} numbers are unique and valid for 6/${max}.`,`You have ${s.odd} odd and ${count-s.odd} even numbers, with ${s.low} in 1–${half} and ${count-s.low} in ${half+1}–${max}.`,`Your numbers span ${s.span} places, with a total of ${s.sum}.`,`${locks.length?`${locks.length} locked favorite${locks.length===1?'':'s'} reflect your preferences. `:''}These describe your selection; they are not evidence of a winning advantage.`];$('review-body').textContent=observations.join('\n');notice(challenge?'Challenge ready. Your numbers have not changed.':'Selection review ready. Your numbers have not changed.');}
$('challenge').onclick=()=>review(true);$('support').onclick=()=>review(false);
$('copy').onclick=async()=>{const text=`6/${max} (${systemLabel(count)}): ${selected.map(n=>String(n).padStart(2,'0')).join(' · ')}`;try{await navigator.clipboard.writeText(text);notice('Selection copied.');}catch{notice(`Copy manually: ${text}`);}};
$('selections').onclick=async e=>{
 const button=e.target.closest('[data-entry]');if(!button||busy)return;
 const entry=entries.find(item=>item.id===Number(button.dataset.entry));if(!entry)return;
 const action=button.dataset.action;
 if(action==='delete'){snapshot();entries=entries.filter(item=>item.id!==entry.id);if(activeId===entry.id){activeId=null;selected=[];locks=[];resetReview();}saveEntries();notice('Set deleted. Undo is available.');render();return;}
 if(action==='final'){snapshot();entry.final=!entry.final;saveEntries();notice(entry.final?'Set locked in and added to your WhatsApp message.':'Set removed from your WhatsApp message.');render();return;}
 if(activeId!==entry.id){snapshot();count=entry.numbers.length;max=entry.max;style=entry.style;selected=[...entry.numbers];locks=[];activeId=entry.id;resetReview();}
 render();
 if(action==='refine')await changeNumbers(true);
 else if(action==='challenge'||action==='support')review(action==='challenge');
 else notice('Saved set selected. Choose Refine, Challenge, or Support.');
};
$('whatsapp-number').value=whatsappNumber;
$('save-whatsapp').onclick=()=>{
 const number=normalizePhone($('whatsapp-number').value);
 if(!number){notice('Enter a valid international number including country code.');return;}
 whatsappNumber=number;
 try{localStorage.setItem('toto-whatsapp',number);notice('WhatsApp number saved in this browser only.');}catch{notice('Storage is unavailable. Your number will last only until this page closes.');}
 renderEntries();
};
$('forget-whatsapp').onclick=()=>{
 whatsappNumber='';$('whatsapp-number').value='';
 try{localStorage.removeItem('toto-whatsapp');notice('WhatsApp number removed from this browser.');}catch{notice('Number cleared for this page. Clear browser site data to remove any previously saved number.');}
 renderEntries();
};
$('whatsapp').onclick=()=>notice('WhatsApp opened with your prepared message. Press Send there to deliver it.');
render();
