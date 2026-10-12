import {choose,editCode,validate,commit} from './domain.js';
export function connect(api){
 const {get,set,render,$,fresh,ALL_NONE,codes}=api;let toastTimer,op=0,returnFocus;
 const update=patch=>{set({...get(),...patch});render();};
 function toast(message,success=false){clearTimeout(toastTimer);$('#toast').classList.toggle('success-toast',success);$('#toast').textContent=message;toastTimer=setTimeout(()=>$('#toast').textContent='',success?2500:5500);}
 function overlay(name){const node=document.activeElement;returnFocus=node?.dataset?.action?`[data-action="${node.dataset.action}"]`:node?.dataset?.item?`[data-item="${node.dataset.item}"]`:null;update({overlay:name});requestAnimationFrame(()=>$('#overlay button')?.focus());}
 function close(){if(get().busy)return;update({overlay:null});if(returnFocus)$(returnFocus)?.focus();}
 function entry(){const s=get();update({view:'entry',overlay:null,inputs:s.inputs.length===s.qty?s.inputs:Array(s.qty).fill('')});}
 function scanTarget(){update({target:get().flow==='human'?'C-14-15-02':'A-02-01-01-01'});if(get().flow==='human')overlay('confirm');else entry();}
 function nextSelected(){const s=get();if(!s.selected.length){toast('请先选择需要调拨出的追溯码或实物');return;}update({qty:s.selected.length,view:'scan',inputs:[]});}
 function fill(index,raw,scan){const s=get(),result=editCode(s.inputs,index,raw,scan);set({...s,inputs:result.inputs});const node=$('#trace-'+index);node.value=result.inputs[index];node.classList.toggle('complete',result.inputs[index].length===20);node.setAttribute('aria-invalid',Boolean(result.error||node.value&&node.value.length<20));if(result.error)toast(result.error);else {clearTimeout(toastTimer);$('#toast').textContent='';if(result.next>=0)$('#trace-'+result.next)?.focus();}}
 function scanCode(index){const s=get();let raw=s.flow==='pusher'?s.batches.find(b=>b.id===s.batch).codes[s.selected[index]]:null;raw=raw||('200000000000000000'+String(10+index));fill(index,raw,true);}
 async function submit(){const s=get();if(s.busy)return;const error=validate(s,ALL_NONE);if(error){toast(error);return;}const token=++op;update({busy:true});await new Promise(r=>setTimeout(r,650));if(token!==op)return;const result=commit(get(),ALL_NONE,new Date().toLocaleString('zh-CN',{hour12:false}));if(result.error){update({busy:false});toast(result.error);return;}set(result.state);render();toast('调拨成功，库存和追溯码已同步',true);}
 document.addEventListener('click',e=>{
  const flow=e.target.closest('[data-flow]');if(flow){if(get().busy)return;op++;set(fresh(flow.dataset.flow));render();$('#toast').textContent='';return;}
  const trace=e.target.closest('[data-trace]');if(trace){scanCode(Number(trace.dataset.trace));return;}
  const clear=e.target.closest('[data-clear]');if(clear){const i=Number(clear.dataset.clear);fill(i,'',false);$('#trace-'+i).focus();return;}
  const item=e.target.closest('[data-item]');if(item){if(item.dataset.item!=='0'){toast('本演示使用第一条商品，请选择首条货位');return;}if(get().flow==='manual'){if(!get().manualQty){toast('该货位已无可调拨库存');return;}update({qty:Math.min(3,get().manualQty)});overlay('sheet');}else update({view:'select'});return;}
  const batch=e.target.closest('[data-batch]');if(batch){set(choose(get(),batch.dataset.batch,null,true));render();return;}
  const code=e.target.closest('[data-code]');if(code){const [b,i]=code.dataset.code.split(':');set(choose(get(),b,Number(i)));render();return;}
  const query=e.target.closest('[data-scan="query"]');if(query){update({query:'999'});$('#query-input')?.focus();return;}
  const b=e.target.closest('[data-action]');if(!b||b.disabled)return;const action=b.dataset.action;
  if(action==='start')update({view:'query'});
  if(action==='home')update({view:'home',overlay:null});
  if(action==='query')update({view:'query',overlay:null});
  if(action==='select')update({view:'select',overlay:null});
  if(action==='entry-back')update({view:get().flow==='manual'?'query':'scan',overlay:null});
  if(action==='clear-query')update({query:''});
  if(action==='history')overlay('history');
  if(action==='close')close();
  if(action==='sheet-target'){const qty=Number($('#quantity').value);update({target:'A-02-01-01-01',qty});}
  if(action==='sheet-next'){const s=get(),qty=Number($('#quantity').value);if(!s.target){toast('请扫描目标货位');return;}if(!Number.isInteger(qty)||qty<1||qty>s.manualQty){toast('请输入正整数，且不可超过可调拨库存');return;}update({qty});entry();}
  if(action==='selected-next')nextSelected();
  if(action==='scan-target')scanTarget();
  if(action==='submit'){const error=validate(get(),ALL_NONE);if(error)toast(error);else overlay('confirm');}
  if(action==='commit')submit();
 });
 document.addEventListener('input',e=>{if(e.target.matches('[data-trace]'))fill(Number(e.target.dataset.trace),e.target.value,false);else if(e.target.id==='query-input'){set({...get(),query:e.target.value});const value=e.target.value;const position=e.target.selectionStart;render();$('#query-input').focus();$('#query-input').value=value;$('#query-input').setSelectionRange(position,position);}else if(e.target.id==='quantity')set({...get(),qty:Number(e.target.value)});});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&get().overlay){close();return;}if(get().overlay&&e.key==='Tab'){const nodes=Array.from($('#overlay').querySelectorAll('button:not(:disabled),input'));if(!nodes.length)return;const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}if(e.key==='Enter'&&e.target.matches('[data-trace]')){e.preventDefault();const error=validate(get(),ALL_NONE);if(error)toast(error);else overlay('confirm');}});
 $('#reset').onclick=()=>{if(get().busy)return;op++;set(fresh(get().flow));render();$('#toast').textContent='';};
 // Read-only inspection hook for acceptance. No fixture mutations exposed in the product UI.
 window.demo={snapshot:()=>structuredClone(get())};
}
