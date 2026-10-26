/* Shared pure number-selection logic; usable by the browser and Node tests. */
(function(root){
const range=max=>Array.from({length:max},(_,i)=>i+1);
function randomInt(max){const values=new Uint32Array(1),limit=Math.floor(4294967296/max)*max;do{globalThis.crypto.getRandomValues(values)}while(values[0]>=limit);return values[0]%max;}
function sample(pool,count){const copy=[...pool],out=[];while(out.length<count&&copy.length)out.push(copy.splice(randomInt(copy.length),1)[0]);return out;}
function stats(ticket,max){const sorted=[...ticket].sort((a,b)=>a-b);return {odd:ticket.filter(n=>n%2).length,low:ticket.filter(n=>n<=Math.floor(max/2)).length,sum:ticket.reduce((a,b)=>a+b,0),adjacent:sorted.slice(1).filter((n,i)=>n===sorted[i]+1).length,span:sorted.length?sorted.at(-1)-sorted[0]:0};}
function quality(ticket,max,style,model=[]){const s=stats(ticket,max),target=ticket.length/2;if(style==='low')return -s.sum;if(style==='high')return s.sum;if(style==='model'&&model.length)return ticket.filter(n=>model.includes(n)).length*5-Math.abs(s.odd-target);return -Math.abs(s.odd-target)*4-Math.abs(s.low-target)*4-Math.abs(s.sum-target*(max+1))/max-s.adjacent*.5;}
function generate(max,style,locks=[],model=[],count=6){const fixed=[...new Set(locks)];if(![55,58].includes(max)||![6,7,8].includes(count)||fixed.length>count||fixed.some(n=>!Number.isInteger(n)||n<1||n>max))throw Error('Invalid selection');if(fixed.length===count)return fixed.sort((a,b)=>a-b);let pool=range(max).filter(n=>!fixed.includes(n));const needed=count-fixed.length,half=Math.floor(max/2);if(style==='low'||style==='high')pool=pool.filter(n=>style==='low'?n<=half:n>half);
let result;
if(style==='creative'&&!fixed.length){const step=randomInt(Math.floor((max-1)/(count-1)))+1,start=randomInt(max-step*(count-1))+1;result=Array.from({length:count},(_,i)=>start+i*step);}
else if(style==='creative'){const step=randomInt(8)+2,start=randomInt(max)+1;const series=range(max).map((_,i)=>(start-1+i*step)%max+1);const unique=[...new Set(series)].filter(n=>!fixed.includes(n));result=[...fixed,...unique.slice(0,needed)];if(result.length<count)result.push(...sample(pool.filter(n=>!result.includes(n)),count-result.length));}
else {result=[...fixed,...sample(pool,needed)];if(style==='balanced'||style==='model'){for(let i=0;i<400;i++){const next=[...fixed,...sample(pool,needed)];if(quality(next,max,style,model)>quality(result,max,style,model))result=next;}}}
return result.sort((a,b)=>a-b);}
/* 4D tickets are digit arrays: 4 digits, or 8 for a 4D Jackpot pair. Digits may repeat; locks are positions. */
const groups=digits=>digits.length>4?[digits.slice(0,4),digits.slice(4)]:[digits];
function distinctPair(digits){return digits.length!==8||digits.slice(0,4).join('')!==digits.slice(4).join('');}
function digitStats(digits){return {odd:digits.filter(d=>d%2).length,low:digits.filter(d=>d<=4).length,sum:digits.reduce((a,b)=>a+b,0),repeats:groups(digits).reduce((a,g)=>a+g.length-new Set(g).size,0),steps:groups(digits).reduce((a,g)=>a+g.slice(1).filter((d,i)=>Math.abs(d-g[i])===1).length,0)};}
function digitQuality(digits,style){const s=digitStats(digits),target=digits.length/2;if(style==='low')return -s.sum;if(style==='high')return s.sum;return -Math.abs(s.odd-target)*4-Math.abs(s.low-target)*4-s.repeats*2-s.steps*.5;}
function generateDigits(length,style,locks=[],current=[]){const fixed=[...new Set(locks)];if(![4,8].includes(length)||fixed.some(i=>!Number.isInteger(i)||i<0||i>=length||!Number.isInteger(current[i])||current[i]<0||current[i]>9))throw Error('Invalid selection');if(fixed.length===length)return [...current];
const pool=style==='low'?[0,1,2,3,4]:style==='high'?[5,6,7,8,9]:range(10).map(n=>n-1);
const draw=()=>{const steps=[0,1].map(()=>[randomInt(10),randomInt(9)+1]);return Array.from({length},(_,i)=>fixed.includes(i)?current[i]:style==='creative'?(steps[i>>2][0]+(i%4)*steps[i>>2][1])%10:pool[randomInt(pool.length)]);};
const tries=style==='balanced'||style==='model'?400:1;let result=null;for(let i=0;i<1000&&(i<tries||!result);i++){const next=draw();if(distinctPair(next)&&(!result||digitQuality(next,style)>digitQuality(result,style)))result=next;}
if(!result)throw Error('Choose two different 4D numbers.');return result;}
/* Refine insights: descriptive measures plus up to three one-change suggestions, each with a different aim. */
function comb(n,k){let r=1;for(let i=1;i<=k;i++)r=r*(n-k+i)/i;return Math.round(r);}
function sumPercentile(ticket,max,samples=4000){const sum=ticket.reduce((a,b)=>a+b,0);let below=0,equal=0;for(let i=0;i<samples;i++){const s=sample(range(max),ticket.length).reduce((a,b)=>a+b,0);if(s<sum)below++;else if(s===sum)equal++;}return Math.round((below+equal/2)/samples*100);}
function permutations(group){const counts=Object.values(group.reduce((a,d)=>({...a,[d]:(a[d]||0)+1}),{}));return counts.reduce((r,c)=>r/[1,1,2,6,24][c],24);}
const best=(options,score)=>{let top=null,value=-Infinity;for(const o of options){const v=score(o);if(v>value){value=v;top=o;}}return top;};
// Each aim is [id, eligible options or false, score]; later aims skip changes an earlier aim already suggested.
function pickDistinct(aims){const out=[];for(const [id,pool,score] of aims){if(!pool||out.length===3)continue;const top=best(pool.filter(o=>!out.some(s=>s.numbers.join()===o.join())),score);if(top)out.push({id,numbers:top});}return out;}
const random=()=>randomInt(1000000);
function suggestions(ticket,max,locks){const options=[];for(const old of ticket.filter(n=>!locks.includes(n)))for(const n of range(max))if(!ticket.includes(n))options.push(ticket.map(x=>x===old?n:x).sort((a,b)=>a-b));if(!options.length)return [];
const balanced=o=>quality(o,max,'balanced'),dates=t=>t.filter(n=>n<=31).length,gap=t=>Math.min(...t.slice(1).map((n,i)=>n-t[i]));
return pickDistinct([['balance',options,balanced],['dates',dates(ticket)>ticket.length/2&&options.filter(o=>dates(o)<dates(ticket)),balanced],['spread',gap(ticket)<4&&options.filter(o=>gap(o)>gap(ticket)),o=>gap(o)*10+balanced(o)],['wildcard',options,random]]);}
function digitSuggestions(digits,locks){const options=[];digits.forEach((d,i)=>{if(!locks.includes(i))for(let x=0;x<10;x++){const o=digits.map((v,j)=>j===i?x:v);if(x!==d&&distinctPair(o))options.push(o);}});if(!options.length)return [];
const balanced=o=>digitQuality(o,'balanced'),arrangements=t=>groups(t).reduce((a,g)=>a+permutations(g),0);
return pickDistinct([['balance',options,balanced],['repeats',digitStats(digits).repeats>0&&options.filter(o=>digitStats(o).repeats<digitStats(digits).repeats),balanced],['arrangements',arrangements(digits)<groups(digits).length*24&&options.filter(o=>arrangements(o)>arrangements(digits)),o=>arrangements(o)*10+balanced(o)],['wildcard',options,random]]);}
const api={range,stats,generate,distinctPair,digitStats,generateDigits,comb,sumPercentile,permutations,suggestions,digitSuggestions};if(typeof module!=='undefined')module.exports=api;else root.Picker=api;
})(globalThis);
