export function choose(s,batch,index,whole=false,scan=false){
 const b=s.batches.find(b=>b.id===batch);if(!b||!b.qty)return s;
 let selected=s.batch===batch?s.selected.slice():[];
 if(whole)selected=selected.length===b.qty?[]:Array.from({length:b.qty},(_,i)=>i);
 else if(scan){if(!selected.includes(index))selected.push(index);}
 else selected=selected.includes(index)?selected.filter(i=>i!==index):selected.concat(index);
 return {...s,batch:selected.length?batch:null,selected:selected.sort((a,b)=>a-b)};
}
export function editCode(values,index,raw,scan=false){
 const inputs=values.slice();if(scan&&!/^\d{20}$/.test(raw))return {inputs,error:'请扫描追溯码录入'};
 let value=raw.replace(/\D/g,'').slice(0,20);if(value.length===20&&inputs.some((v,i)=>i!==index&&v===value)){
  if(!scan){value=value.slice(0,19);inputs[index]=value;}
  return {inputs,error:'请勿录入相同追溯码'};
 }
 inputs[index]=value;return {inputs,next:value.length===20?inputs.findIndex((v,i)=>i>index&&v.length<20):-1};
}
export function validate(s,allNone){
 if(!s.target)return '请扫描目标货位';
 if(!Number.isInteger(s.qty)||s.qty<1)return '请输入正确的调拨数量';
 const available=s.flow==='manual'?s.manualQty:s.batches.find(b=>b.id===s.batch)?.qty||0;
 if(s.qty>available)return '调拨数量不可超过可调拨库存';
 if(s.flow==='human')return null;
 if(s.inputs.length!==s.qty)return allNone;
 if(s.inputs.some(Boolean)&&!s.inputs.every(v=>/^\d{20}$/.test(v)))return allNone;
 if(new Set(s.inputs.filter(Boolean)).size!==s.inputs.filter(Boolean).length)return '请勿录入相同追溯码';
 if(s.flow==='pusher'){
  const b=s.batches.find(b=>b.id===s.batch);const original=s.selected.map(i=>b.codes[i]).filter(Boolean);
  if(original.length&&(s.inputs.length!==original.length||original.some(c=>!s.inputs.includes(c))))return '调拨后的追溯码必填，且必须与调拨前选中的追溯码一致';
 }
 return null;
}
export function commit(s,allNone,time){
 const error=validate(s,allNone);if(error)return {error,state:s};
 const next=structuredClone(s);let transferred=[];
 if(s.flow==='manual'){next.manualQty-=s.qty;transferred=s.inputs.filter(Boolean);}
 else {const b=next.batches.find(b=>b.id===s.batch);transferred=s.flow==='human'?s.selected.map(i=>b.codes[i]).filter(Boolean):s.inputs.filter(Boolean);b.codes=b.codes.filter((_,i)=>!s.selected.includes(i));b.qty-=s.qty;}
 next.targetQty+=s.qty;next.targetCodes.push(...transferred);const remaining=s.flow==='manual'?next.manualQty:next.batches.reduce((a,b)=>a+b.qty,0);
 next.history.push({source:s.source,target:s.target,qty:s.qty,codes:transferred,time,remaining,targetQty:next.targetQty});
 next.revision++;next.busy=false;next.overlay=null;next.view='query';next.target='';next.inputs=[];next.selected=[];next.batch=null;
 return {state:next};
}
