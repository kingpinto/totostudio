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
function refine(ticket,max,locks,style,model=[]){let best=null,score=-Infinity;for(const old of ticket.filter(n=>!locks.includes(n))){for(const replacement of range(max).filter(n=>!ticket.includes(n))){const next=ticket.map(n=>n===old?replacement:n);const q=quality(next,max,style==='lucky'||style==='creative'?'balanced':style,model);if(q>score){score=q;best=next;}}}return best?best.sort((a,b)=>a-b):[...ticket];}
const api={range,stats,generate,refine};if(typeof module!=='undefined')module.exports=api;else root.Picker=api;
})(globalThis);
