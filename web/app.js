const $=id=>document.getElementById(id);
const styles=[['lucky','✦','Feeling lucky','A fresh random set. Every available number gets an equal chance; locked numbers stay.'],['model','⌘','Model based',''],['low','↙','Low numbers','Explore the lower half of the board. Locked favorites can sit outside this range.'],['high','↗','High numbers','Explore the upper half of the board. Locked favorites can sit outside this range.'],['balanced','◒','Balanced','Look for an even mix of odd and even numbers, and a spread across both halves. Locks may limit the balance.'],['creative','〰','Creative series','Play with evenly spaced sequences. With locks, explore a repeating-step pattern.']];
// 4D games store digit arrays; digitGame is null while a 6/55 or 6/58 game is active.
const digitGames={'4d':['4D',4],'4dj':['4D Jackpot',8]};
const ideaText={balance:['More balanced','Evens out odd/even and low/high.'],dates:['Fewer date numbers','Moves one number above 31.'],spread:['Wider spacing','Pulls apart your closest numbers.'],repeats:['Fewer repeats','Replaces a repeated digit.'],arrangements:['More arrangements','Gives your digits more distinct orderings.'],wildcard:['Wildcard','A random one-number change for a fresh look.']};
let count=6,max=58,digitGame=null,style='lucky',selected=[],locks=[],previous=null,model=null,busy=false,revision=0;
let entries=[],ideas=[],nextId=1,whatsappNumber='';
function normalizePhone(value){const number=value.replace(/[\s()+-]/g,'');return /^[1-9][0-9]{7,14}$/.test(number)?number:'';}
try{whatsappNumber=normalizePhone(localStorage.getItem('toto-whatsapp')||'');}catch{}
function validEntry(e){if(!e||!Array.isArray(e.numbers))return false;if(digitGames[e.game])return e.numbers.length===digitGames[e.game][1]&&e.numbers.every(n=>Number.isInteger(n)&&n>=0&&n<=9)&&Picker.distinctPair(e.numbers);return [55,58].includes(e.max)&&[6,7,8].includes(e.numbers.length)&&new Set(e.numbers).size===e.numbers.length&&e.numbers.every(n=>Number.isInteger(n)&&n>=1&&n<=e.max);}
try {
 const saved=JSON.parse(localStorage.getItem('toto-selections')||'[]');
 if(Array.isArray(saved)) entries=saved.filter(validEntry).map(e=>({id:nextId++,...(digitGames[e.game]?{game:e.game}:{game:String(e.max),max:e.max}),numbers:e.numbers,style:styles.some(s=>s[0]===e.style)?e.style:'lucky',final:e.final===true}));
} catch {}
const gameKey=()=>digitGame||String(max);
const fmt=n=>n.toLocaleString('en-US');
const pad=n=>String(n).padStart(2,'0');
function gameLabel(game){return digitGames[game]?.[0]??`6/${game}`;}
function formatNumbers(numbers,game){return digitGames[game]?(numbers.length>4?[numbers.slice(0,4),numbers.slice(4)]:[numbers]).map(g=>g.join(' ')).join(' - '):numbers.map(pad).join(' ');}
// Messages group sets under one heading per game and size: 6/55, 6/58, 4D, then 4D Jackpot.
function messageText(list){const order=e=>digitGames[e.game]?(e.game==='4d'?1000:1001):e.max*10+e.numbers.length;const heading=e=>digitGames[e.game]?gameLabel(e.game):`6/${e.max} - System ${e.numbers.length}`;const groups=new Map();for(const e of [...list].sort((a,b)=>order(a)-order(b)))groups.set(heading(e),[...(groups.get(heading(e))||[]),formatNumbers(e.numbers,e.game)]);return [...groups].map(([title,lines])=>[title,...lines].join('\n')).join('\n\n');}
function setLabel(e){return digitGames[e.game]?gameLabel(e.game):`6/${e.max} · ${systemLabel(e.numbers.length)}`;}
function saveEntries(){try{localStorage.setItem('toto-selections',JSON.stringify(entries));}catch{notice('Browser storage is unavailable. Keep this page open to retain your list.');}}
function currentEntry(){return selected.length===count?entries.find(e=>e.game===gameKey()&&e.numbers.join(',')===selected.join(',')):undefined;}
function renderEntries(){
 const activeId=currentEntry()?.id;
 $('saved-count').textContent=`${entries.length} saved`;
 $('selections').innerHTML=entries.length?entries.map(e=>`<div class="saved-row ${e.id===activeId?'active':''}"><button class="select-set" data-entry="${e.id}" data-action="select" aria-pressed="${e.id===activeId}"><small>${setLabel(e)} · ${styles.find(s=>s[0]===e.style)[2]}${e.final?' · Locked in':''}</small><strong>${formatNumbers(e.numbers,e.game)}</strong></button><div class="row-actions">${[['refine','Refine'],['final',e.final?'Unlock set':'Lock in'],['delete','Delete']].map(([action,label])=>`<button data-entry="${e.id}" data-action="${action}" ${busy?'disabled':''}>${label}</button>`).join('')}</div></div>`).join(''):'<p class="hint">Add a set from your selection to start your list.</p>';
 const finalized=entries.filter(e=>e.final);
 const message=messageText(finalized);$('delete-all').disabled=!entries.length||busy;
 $('message-preview').textContent=finalized.length?message:'Lock in a set above to prepare your message.';
 $('whatsapp').hidden=!finalized.length||!whatsappNumber;
 $('whatsapp').href=finalized.length&&whatsappNumber?`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`:'';
}
function systemLabel(size){return size===6?'Standard 6':`System ${size}`;}
function digitNoun(){return digitGame==='4dj'?'4D pair':'4D number';}
function notice(text){$('status').textContent=text;}
function modelNote(){return digitGame?'No 4D draw history is supplied. This pattern model looks for a mix of odd and even digits, low and high digits, and few repeats.':max===55?'Uses the existing rank-ensemble model and supplied 6/55 history. Historical patterns are not winning probabilities.':'No 6/58 draw history is supplied. This pattern model scores odd/even balance, low/high balance, sum, and spacing.';}
function snapshot(){previous={count,max,digitGame,selected:[...selected],locks:[...locks],entries:entries.map(e=>({...e,numbers:[...e.numbers]}))};revision++;}
function resetReview(){ideas=[];$('review-title').textContent='Refine your numbers.';$('review-body').textContent='Complete a set and press 👎 to see what shapes it, how it compares with random sets, and a few one-number changes to try.';$('suggestions').innerHTML='';}
function render(){
const digits=!!digitGame,saved=currentEntry();
renderEntries();if(!digits)$('system').value=String(count);$('system').disabled=digits;$('pick-hint').textContent=digits?`Tap digits in order to build ${digitGame==='4dj'?'two different 4D numbers':'your 4D number'}. Digits can repeat.`:`Tap to pick or remove a number. Choose up to ${count}.`;$('selection-title').textContent=digits?`Your ${digitNoun()}.`:`Your ${count} possibilities.`;$('game').value=gameKey();$('count').textContent=`${selected.length} / ${count} ${digits?'digits':'selected'}`;
$('board').className=digits?'board digits':'board';
$('board').innerHTML=digits?Picker.range(10).map(n=>`<button class="number" data-number="${n-1}" aria-label="Digit ${n-1}">${n-1}</button>`).join('')+`<button class="number back" data-number="-1" aria-label="Delete last digit" ${selected.length?'':'disabled'}>⌫ Delete last digit</button>`:Picker.range(58).map(n=>`<button class="number ${selected.includes(n)?'selected':''} ${locks.includes(n)?'locked':''}" data-number="${n}" aria-label="Number ${n}${locks.includes(n)?', locked':''}${n>max?', unavailable for 6/55':''}" aria-pressed="${selected.includes(n)}" ${n>max?'disabled':''}>${pad(n)}</button>`).join('');
$('styles').innerHTML=styles.map(([id,icon,label])=>`<button class="style ${style===id?'active':''}" data-style="${id}" aria-pressed="${style===id}"><span aria-hidden="true">${icon}</span><strong>${label}</strong></button>`).join('');
$('style-note').textContent=style==='model'?modelNote():styles.find(s=>s[0]===style)[3];
$('ticket').className=digits?`balls digits${count===8?' pair':''}`:'balls';
$('ticket').innerHTML=digits?Array.from({length:count},(_,i)=>{const d=selected[i];return d!==undefined?`<button class="ball ${locks.includes(i)?'locked':''}" data-lock="${i}" aria-label="${locks.includes(i)?'Unlock':'Lock'} digit ${i+1} (${d})" aria-pressed="${locks.includes(i)}">${d}${locks.includes(i)?'<small>LOCKED</small>':''}</button>`:'<span class="ball empty" aria-label="Empty slot">·</span>';}).join(''):Array.from({length:count},(_,i)=>{const n=selected[i];return n?`<button class="ball ${locks.includes(n)?'locked':''}" data-lock="${n}" aria-label="${locks.includes(n)?'Unlock':'Lock'} number ${n}" aria-pressed="${locks.includes(n)}">${pad(n)}${locks.includes(n)?'<small>LOCKED</small>':''}</button>`:'<span class="ball empty" aria-label="Empty slot">·</span>';}).join('');
if(digits){const s=Picker.digitStats(selected);$('metrics').innerHTML=selected.length?`<span>${s.odd} odd / ${selected.length-s.odd} even digits</span><span>${s.low} low (0–4) / ${selected.length-s.low} high</span><span>Digit sum ${s.sum}</span>`:'';}
else{const s=Picker.stats(selected,max);$('metrics').innerHTML=selected.length?`<span>${s.odd} odd / ${selected.length-s.odd} even</span><span>${s.low} low / ${selected.length-s.low} high</span><span>Sum ${s.sum}</span>`:'';}
for(const id of ['refine','copy'])$(id).disabled=selected.length!==count||busy;
$('add').disabled=selected.length!==count||!!saved||busy;$('add').className=saved?'icon in-list':'icon';$('add').title=$('add').ariaLabel=saved?'Already in your list':'Add to list';
$('generate').disabled=locks.length===count||busy;$('generate').innerHTML=busy?'Finding your numbers…':`Generate my ${digits?digitNoun():count} <span>↗</span>`;$('undo').disabled=!previous||busy;
}
$('board').onclick=e=>{const b=e.target.closest('[data-number]');if(!b||b.disabled)return;const n=Number(b.dataset.number);
 if(digitGame){if(n<0){if(!selected.length)return;snapshot();selected=selected.slice(0,-1);locks=locks.filter(i=>i<selected.length);}else{if(selected.length===count){notice('Your number is complete. Delete a digit first, or generate a new one.');return;}const next=[...selected,n];if(!Picker.distinctPair(next)){notice('Choose two different 4D numbers for the jackpot.');return;}snapshot();selected=next;}resetReview();notice(`${selected.length} of ${count} digits entered.`);render();return;}
 if(!selected.includes(n)&&selected.length===count){notice('Your set is full. Remove a number first, or generate a new set.');return;}snapshot();if(selected.includes(n)){selected=selected.filter(x=>x!==n);locks=locks.filter(x=>x!==n);}else selected.push(n);selected.sort((a,b)=>a-b);resetReview();notice(`${selected.length} of ${count} selected.`);render();};
$('ticket').onclick=e=>{const b=e.target.closest('[data-lock]');if(!b)return;const n=Number(b.dataset.lock);snapshot();locks=locks.includes(n)?locks.filter(x=>x!==n):[...locks,n];resetReview();notice(`${digitGame?`Digit ${n+1}`:n} ${locks.includes(n)?'locked':'unlocked'}. ${locks.length===count?`Unlock ${digitGame?'a digit':'a number'} to generate or see suggested changes.`:''}`);render();};
$('styles').onclick=e=>{const b=e.target.closest('[data-style]');if(b){style=b.dataset.style;revision++;render();}};
$('game').onchange=()=>{const value=$('game').value,next=digitGames[value]?value:null;snapshot();
 if(next||digitGame){digitGame=next;if(!next)max=Number(value);count=next?digitGames[next][1]:6;selected=[];locks=[];resetReview();notice(`Switched to ${gameLabel(gameKey())}. ${next?`Enter or generate your ${digitNoun()}.`:'Choose or generate six numbers.'} Your saved sets are kept.`);render();return;}
 max=Number(value);const removed=selected.filter(n=>n>max);selected=selected.filter(n=>n<=max);locks=locks.filter(n=>n<=max);resetReview();notice(removed.length?`Switched to 6/${max}. Removed out-of-range numbers: ${removed.join(', ')}.`:`Switched to 6/${max}.`);render();};
$('system').onchange=()=>{snapshot();count=Number($('system').value);selected=[];locks=[];resetReview();notice(`${systemLabel(count)} selected. Choose or generate ${count} numbers. Your saved sets are kept.`);render();};
$('clear').onclick=()=>{snapshot();selected=[];locks=[];resetReview();notice('Selection cleared.');render();};
$('undo').onclick=()=>{if(!previous)return;const old=previous;previous=null;count=old.count;max=old.max;digitGame=old.digitGame;selected=old.selected;locks=old.locks;entries=old.entries;saveEntries();revision++;resetReview();notice('Last change undone.');render();};
async function getModel(){if(model)return model;const response=await fetch('/api/model');if(!response.ok)throw Error('The historical model could not load. Check the Python server or choose another style.');const data=await response.json();if(!Array.isArray(data.ticket)||data.ticket.length!==6||new Set(data.ticket).size!==6||data.ticket.some(n=>!Number.isInteger(n)||n<1||n>55))throw Error('The historical model returned invalid numbers.');model=data;return data;}
async function generateNumbers(){const version=revision;busy=true;render();try{const data=style==='model'&&!digitGame&&max===55?await getModel():null;if(version!==revision){notice('Selection changed while loading. Try again with your current settings.');return;}snapshot();selected=digitGame?Picker.generateDigits(count,style,locks,selected):Picker.generate(max,style,locks,data?.ticket,count);resetReview();const source=data?`Historical ensemble: ${data.draws} supplied draws through ${data.after}. The source is not live or independently verified.`:style==='model'?modelNote():styles.find(s=>s[0]===style)[3];$('review-title').textContent=digitGame?`Your ${digitNoun()} is ready.`:`Your ${count} numbers are ready.`;$('review-body').textContent=`${source}\nPress 👍 to add these numbers to your list, or 👎 for insights and changes to try.`;notice('New numbers ready. Press 👍 to keep them in your list.');}catch(error){notice(error.message);}finally{busy=false;render();}}
$('generate').onclick=generateNumbers;
function lottoInsights(){const s=Picker.stats(selected,max),n=count,half=Math.floor(max/2),dates=selected.filter(x=>x<=31).length,gaps=selected.slice(1).map((x,i)=>x-selected[i]),endings=Object.entries(selected.reduce((a,x)=>({...a,[x%10]:(a[x%10]||0)+1}),{})).sort((a,b)=>b[1]-a[1]),groups=new Set(selected.map(x=>Math.floor(x/10))).size,total=Picker.comb(max,6),covered=Picker.comb(n,6);
 return [['Balance',`${s.odd} odd and ${n-s.odd} even; ${s.low} in 01–${half} and ${n-s.low} in ${half+1}–${max}.`],
 ['Total',`${s.sum} is higher than about ${Picker.sumPercentile(selected,max)}% of random ${n}-number sets. The average total is ${n*(max+1)/2}.`],
 ['Spacing',`${pad(selected[0])} to ${pad(selected[n-1])}, with a largest gap of ${Math.max(...gaps)} and ${s.adjacent?`${s.adjacent} consecutive pair${s.adjacent===1?'':'s'}`:'no consecutive numbers'}.`],
 ['Spread',`Uses ${groups} of the 6 number groups (01–09, 10–19 … 50–${max})${endings[0][1]>=3?`; ${endings[0][1]} numbers end in ${endings[0][0]}`:''}.`],
 ['Shared prize',dates===n?`All ${n} numbers are 31 or lower, so they could all be calendar dates. Many players pick birthdays, so a jackpot won with this set is more likely to be shared.`:dates>n/2?`${dates} of ${n} numbers are 31 or lower, the range birthday picks use. More numbers above 31 make a shared jackpot less likely.`:`${n-dates} of ${n} numbers are above 31, which birthday picks never use, so a jackpot is less likely to be shared.`],
 ['Odds',n===6?`1 in ${fmt(total)} for the jackpot.`:`System ${n} plays ${covered} six-number combinations, so the jackpot odds are 1 in ${fmt(Math.round(total/covered))} instead of 1 in ${fmt(total)}.`]];}
function digitPattern(g){const t=g.join(''),steps=g.slice(1).map((d,i)=>d-g[i]),perms=Picker.permutations(g);
 if(perms===1)return 'all four digits are the same';if(steps.every(x=>x===1)||steps.every(x=>x===-1))return 'a straight run of digits';if(/^(19|20)\d\d$/.test(t))return 'it reads like a year';if(t===[...t].reverse().join(''))return 'it reads the same backwards';
 const dd=Number(t.slice(0,2)),mm=Number(t.slice(2));if(dd>=1&&dd<=31&&mm>=1&&mm<=12)return 'it could be a date (DDMM)';return {24:'four different digits',12:'one digit appears twice',6:'two pairs of digits',4:'one digit appears three times'}[perms];}
// Odds assume 23 different, uniformly drawn winning numbers: 3 top prizes, 10 Starter, 10 Consolation.
function digitInsights(){const s=Picker.digitStats(selected),n=selected.length,parts=n>4?[selected.slice(0,4),selected.slice(4)]:[selected],jackpot=digitGame==='4dj';
 const lines=parts.map(g=>{const perms=Picker.permutations(g);return [g.join(''),`${digitPattern(g)[0].toUpperCase()+digitPattern(g).slice(1)}. ${perms===1?'There is only one way to arrange these digits.':`These digits have ${perms} different arrangements, so a permutation bet would cover ${perms} numbers.`}`];});
 lines.push(['Balance',`${s.odd} odd, ${n-s.odd} even; ${s.low} low (0–4), ${n-s.low} high (5–9).`]);
 if(jackpot){const [a,b]=parts,shared=[...new Set(a)].filter(d=>b.includes(d)).length;lines.push(['Pair',[...a].sort().join('')===[...b].sort().join('')?'Your two numbers use the same digits in a different order.':shared?`Your two numbers share ${shared} digit${shared===1?'':'s'}.`:'Your two numbers share no digits.']);}
 lines.push(['Odds',jackpot?'Jackpot 1 (both numbers among the 1st, 2nd and 3rd prizes) is 1 in 16,665,000; Jackpot 2 (one top-three and one Starter prize) is 1 in 1,666,500.':'1 in 10,000 for 1st prize, and 23 in 10,000 to match any of the 23 winning numbers.']);
 return lines;}
function describeChange(numbers){if(digitGame){const i=numbers.findIndex((d,j)=>d!==selected[j]);return `Digit ${i+1}: ${selected[i]} → ${numbers[i]}`;}return `${selected.filter(n=>!numbers.includes(n)).map(pad).join(', ')} → ${numbers.filter(n=>!selected.includes(n)).map(pad).join(', ')}`;}
function refineSet(){if(selected.length!==count)return;ideas=digitGame?Picker.digitSuggestions(selected,locks):Picker.suggestions(selected,max,locks);
 $('review-title').textContent=`Insights for ${formatNumbers(selected,gameKey())}`;
 $('review-body').innerHTML=`<ul class="insights">${(digitGame?digitInsights():lottoInsights()).map(([label,text])=>`<li><strong>${label}</strong> ${text}</li>`).join('')}</ul><p class="hint">These describe your numbers. No pattern changes the odds of a fair draw.</p>`;
 $('suggestions').innerHTML=ideas.length?'<h3>Try one change</h3>'+ideas.map((idea,i)=>`<div class="suggestion"><div><strong>${ideaText[idea.id][0]}</strong><span>${formatNumbers(idea.numbers,gameKey())}</span><small>${describeChange(idea.numbers)} · ${ideaText[idea.id][1]}</small></div><button data-suggestion="${i}">Use this</button></div>`).join(''):`<p class="hint">Every ${digitGame?'digit':'number'} is locked, so there are no changes to suggest.</p>`;
 notice('Insights ready. Your numbers have not changed.');}
$('refine').onclick=refineSet;
$('suggestions').onclick=e=>{const b=e.target.closest('[data-suggestion]');const idea=b&&ideas[Number(b.dataset.suggestion)];if(!idea||busy)return;snapshot();selected=[...idea.numbers];refineSet();notice('Change applied. Press 👍 to keep it in your list, or Undo to go back.');render();};
$('add').onclick=()=>{if(selected.length!==count||currentEntry()||busy)return;snapshot();entries.push({id:nextId++,game:gameKey(),...(digitGame?{}:{max}),numbers:[...selected],style,final:false});saveEntries();notice('Added to your selection list. Lock it in to include it in your WhatsApp message.');render();};
$('copy').onclick=async()=>{const text=messageText([{game:gameKey(),max,numbers:selected}]);try{await navigator.clipboard.writeText(text);notice('Selection copied.');}catch{notice(`Copy manually: ${text}`);}};
$('selections').onclick=e=>{
 const button=e.target.closest('[data-entry]');if(!button||busy)return;
 const entry=entries.find(item=>item.id===Number(button.dataset.entry));if(!entry)return;
 const action=button.dataset.action;
 if(action==='delete'){snapshot();entries=entries.filter(item=>item.id!==entry.id);saveEntries();notice('Set deleted. Undo is available.');render();return;}
 if(action==='final'){snapshot();entry.final=!entry.final;saveEntries();notice(entry.final?'Set locked in and added to your WhatsApp message.':'Set removed from your WhatsApp message.');render();return;}
 if(currentEntry()?.id!==entry.id){snapshot();digitGame=digitGames[entry.game]?entry.game:null;if(!digitGame)max=entry.max;count=entry.numbers.length;style=entry.style;selected=[...entry.numbers];locks=[];resetReview();}
 render();
 if(action==='refine')refineSet();
 else notice('Saved set loaded. Press Refine for insights.');
};
$('delete-all').onclick=()=>{if(!entries.length||busy||!confirm(`Delete all ${entries.length} saved set${entries.length===1?'':'s'}? This also clears your WhatsApp message.`))return;snapshot();entries=[];saveEntries();notice('All saved sets deleted. Undo is available.');render();};
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
