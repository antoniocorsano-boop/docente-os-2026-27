const PLAN_KEY='DOCENTE_OS_ANNUAL_PLAN_2026_27';

const SEGMENTS={
  Prima:[
    ['1-00',4,'CAN-PACK-1A','Settembre','Ingresso, laboratorio e metodo'],
    ['1-01',8,'CAN-PACK-1A','Settembre/Ottobre','Bisogni, risorse e sistemi'],
    ['1-02',12,'CAN-PACK-1B','Ottobre/Dicembre','Materiali: risorsa → prodotto'],
    ['1-03',6,'CAN-PACK-1B','Novembre/Dicembre','Disegno tecnico — prima parte / Open Day'],
    ['1-03',8,'CAN-PACK-1B','Gennaio/Febbraio','Disegno tecnico — seconda parte'],
    ['1-04',6,'CAN-PACK-1E','Gennaio/Febbraio','Rifiuti, recupero ed economia circolare'],
    ['1-05',10,'CAN-PACK-1C','Marzo/Aprile','Dal problema al progetto'],
    ['1-06',6,'CAN-PACK-1F','Aprile/Maggio','Dati, informazioni e sistemi digitali'],
    ['1-07',6,'CAN-PACK-1D','Maggio/Giugno','Progetto tecnologico sostenibile']
  ],
  Seconda:[
    ['2-01',8,'CAN-PACK-2A','Settembre/Ottobre','Agricoltura, suolo e produzioni sostenibili'],
    ['2-02',8,'CAN-PACK-2B','Ottobre/Novembre','Alimenti, trasformazione e conservazione'],
    ['2-03',8,'CAN-PACK-2C','Novembre/Dicembre','Territorio, città e pianificazione'],
    ['2-06',6,'CAN-PACK-2D','Novembre/Dicembre','Rilievo e scale — prima parte / Open Day'],
    ['2-04',10,'CAN-PACK-2E','Gennaio/Febbraio','Edificio, strutture e materiali'],
    ['2-05',8,'CAN-PACK-2F','Febbraio/Marzo','Abitazione, impianti, sicurezza ed efficienza'],
    ['2-06',8,'CAN-PACK-2D','Gennaio/Aprile','Proiezioni ortogonali — seconda parte'],
    ['2-07',6,'CAN-PACK-2G','Aprile/Maggio','Progettare uno spazio o un semplice oggetto'],
    ['2-08',4,'CAN-PACK-2H','Maggio/Giugno','Dati, rappresentazione digitale e modellazione']
  ],
  Terza:[
    ['3-01',8,'CAN-PACK-3A','Settembre/Ottobre','Energia: forme, trasformazioni e fabbisogni'],
    ['3-02',8,'CAN-PACK-3B','Ottobre/Novembre','Fonti rinnovabili e non rinnovabili'],
    ['3-03',8,'CAN-PACK-3C','Novembre/Dicembre','Produzione, distribuzione e uso energia elettrica'],
    ['3-06',6,'CAN-PACK-3D','Novembre/Dicembre','Assonometria — prima parte / Open Day'],
    ['3-04',8,'CAN-PACK-3E','Gennaio/Febbraio','Elettricità, circuiti e sicurezza'],
    ['3-05',8,'CAN-PACK-3F','Febbraio/Marzo','Macchine, meccanismi e sistemi tecnologici'],
    ['3-06',6,'CAN-PACK-3D','Gennaio/Aprile','Assonometria e sezioni — seconda parte'],
    ['3-07',6,'CAN-PACK-3G','Marzo/Aprile','Algoritmi, reti e automazione'],
    ['3-08',4,'CAN-PACK-3H','Aprile/Maggio','Sostenibilità e scelte responsabili'],
    ['3-09',4,'CAN-PACK-3I','Maggio/Giugno','Progetto conclusivo e orientamento']
  ]
};

const DEFAULT_SECTIONS={
  Prima:[],
  Seconda:[{code:'A',status:'PROVVISORIA',source:'Continuità dalla 1A 2025/26'},{code:'C',status:'PROVVISORIA',source:'Continuità dalla 1C 2025/26'}],
  Terza:[{code:'A',status:'PROVVISORIA',source:'Continuità dalla 2A 2025/26'},{code:'C',status:'PROVVISORIA',source:'Continuità dalla 2C 2025/26'},{code:'E',status:'PROVVISORIA',source:'Continuità dalla 2E 2025/26'}]
};

const STATUS=['PIANIFICATO','SVOLTO','RECUPERATO','RIMODULATO','ANNULLATO'];
const COMPLETE=new Set(['SVOLTO','RECUPERATO','RIMODULATO']);

function clone(v){return JSON.parse(JSON.stringify(v));}
function load(){
  let parsed={};
  try{parsed=JSON.parse(localStorage.getItem(PLAN_KEY)||'{}');}catch{}
  return {
    sections:Object.assign(clone(DEFAULT_SECTIONS),parsed.sections||{}),
    progress:parsed.progress||{}
  };
}
let state=load();

function save(){localStorage.setItem(PLAN_KEY,JSON.stringify(state));}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function pad(n){return String(n).padStart(2,'0');}
function blocksFor(grade){
  const out=[];let n=1;
  SEGMENTS[grade].forEach(([uda,hours,pack,period,focus])=>{
    for(let h=0;h<hours;h+=2)out.push({id:`B${pad(n++)}`,uda,pack,period,focus,hours:2});
  });
  return out;
}
function currentGrade(){return document.getElementById('grade').value;}
function currentSection(){return document.getElementById('section').value;}
function contextKey(blockId){return `${currentGrade()}|${currentSection()}|${blockId}`;}
function sectionRecord(grade,code){return (state.sections[grade]||[]).find(s=>s.code===code);}

function renderSectionSelector(){
  const grade=currentGrade(),sel=document.getElementById('section'),old=sel.value;
  const options=state.sections[grade]||[];
  sel.innerHTML='<option value="">— Vista canonica —</option>'+options.map(x=>`<option value="${esc(x.code)}">${grade} ${esc(x.code)}</option>`).join('');
  if(options.some(x=>x.code===old))sel.value=old;
  else if(options.length)sel.value=options[0].code;
  renderAll();
}

function sectionBadge(status){
  if(status==='CONFERMATA')return '<span class="status ok">CONFERMATA</span>';
  if(status==='PROVVISORIA')return '<span class="status warn">PROVVISORIA</span>';
  return '<span class="status warn">DA CONFERMARE</span>';
}

function renderSectionInfo(){
  const grade=currentGrade(),code=currentSection(),box=document.getElementById('sectionInfo');
  if(!code){
    box.innerHTML=grade==='Prima'?'Le nuove sezioni di classe prima non sono ancora note. La vista mostra il piano canonico senza attribuzione.':'Vista canonica: seleziona una sezione per registrare avanzamento, date ed evidenze.';
    document.getElementById('kSection').innerHTML=sectionBadge('DA CONFERMARE');
    return;
  }
  const rec=sectionRecord(grade,code)||{status:'DA CONFERMARE',source:'Sezione aggiunta localmente'};
  box.innerHTML=`${sectionBadge(rec.status)} · ${esc(rec.source||'Sezione locale')}${rec.status!=='CONFERMATA'?` <button onclick="confirmSection()" style="margin-left:8px">Conferma assegnazione</button>`:''}`;
  document.getElementById('kSection').innerHTML=sectionBadge(rec.status);
}

function getProgress(blockId){
  if(!currentSection())return {status:'PIANIFICATO',date:'',note:''};
  return state.progress[contextKey(blockId)]||{status:'PIANIFICATO',date:'',note:''};
}

function renderPlan(){
  const grade=currentGrade(),blocks=blocksFor(grade),editable=!!currentSection();
  const rows=blocks.map(b=>{
    const p=getProgress(b.id);
    const status=editable?`<select onchange="setField('${b.id}','status',this.value)">${STATUS.map(s=>`<option ${s===p.status?'selected':''}>${s}</option>`).join('')}</select>`:`<span class="status">PIANIFICATO</span>`;
    const date=editable?`<input type="date" value="${esc(p.date)}" onchange="setField('${b.id}','date',this.value)">`:'—';
    const note=editable?`<input value="${esc(p.note)}" placeholder="evidenza / nota" onchange="setField('${b.id}','note',this.value)">`:'—';
    return `<tr><td><b>${b.id}</b></td><td>${esc(b.uda)}</td><td>${esc(b.pack)}</td><td>${esc(b.period)}</td><td>${esc(b.focus)}</td><td>${status}</td><td>${date}</td><td>${note}</td></tr>`;
  }).join('');
  document.getElementById('planTable').innerHTML=`<div class="table"><table><thead><tr><th>Blocco</th><th>UDA</th><th>Pacchetto</th><th>Periodo</th><th>Focus</th><th>Stato</th><th>Data</th><th>Evidenza / nota</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderKpi(){
  const blocks=blocksFor(currentGrade());
  const done=currentSection()?blocks.filter(b=>COMPLETE.has(getProgress(b.id).status)):[];
  const next=blocks.find(b=>!COMPLETE.has(getProgress(b.id).status)&&getProgress(b.id).status!=='ANNULLATO');
  document.getElementById('kBlocks').textContent=`${done.length}/33`;
  document.getElementById('kHours').textContent=`${done.length*2}/66`;
  document.getElementById('kNext').textContent=currentSection()?(next?.id||'CHIUSO'):'B01';
}

function renderAll(){renderSectionInfo();renderPlan();renderKpi();}

function setField(blockId,field,value){
  if(!currentSection())return;
  const key=contextKey(blockId),prev=state.progress[key]||{status:'PIANIFICATO',date:'',note:''};
  state.progress[key]={...prev,[field]:value};
  save();renderKpi();
}

function markNextDone(){
  if(!currentSection())return alert('Seleziona una sezione prima di registrare l’avanzamento.');
  const next=blocksFor(currentGrade()).find(b=>!COMPLETE.has(getProgress(b.id).status)&&getProgress(b.id).status!=='ANNULLATO');
  if(!next)return alert('Tutti i blocchi risultano chiusi.');
  const key=contextKey(next.id),prev=state.progress[key]||{status:'PIANIFICATO',date:'',note:''};
  state.progress[key]={...prev,status:'SVOLTO',date:prev.date||new Date().toISOString().slice(0,10)};
  save();renderAll();
}

function resetSection(){
  if(!currentSection())return alert('Seleziona una sezione.');
  if(!confirm(`Azzerare l’avanzamento di ${currentGrade()} ${currentSection()}?`))return;
  const prefix=`${currentGrade()}|${currentSection()}|`;
  Object.keys(state.progress).filter(k=>k.startsWith(prefix)).forEach(k=>delete state.progress[k]);
  save();renderAll();
}

function addSection(){
  const grade=currentGrade();
  const raw=prompt(`Nuova sezione per ${grade} (es. A, C, E):`);
  if(!raw)return;
  const code=raw.trim().toUpperCase().replace(/[^A-Z0-9-]/g,'').slice(0,4);
  if(!code)return alert('Sezione non valida.');
  state.sections[grade]=state.sections[grade]||[];
  if(state.sections[grade].some(s=>s.code===code))return alert('Sezione già presente.');
  state.sections[grade].push({code,status:'DA CONFERMARE',source:'Sezione aggiunta localmente; assegnazione da validare'});
  save();renderSectionSelector();document.getElementById('section').value=code;renderAll();
}

function confirmSection(){
  const grade=currentGrade(),code=currentSection(),rec=sectionRecord(grade,code);
  if(!rec)return;
  rec.status='CONFERMATA';rec.source='Assegnazione confermata localmente nel planner';
  save();renderAll();
}

document.getElementById('grade').addEventListener('change',renderSectionSelector);
document.getElementById('section').addEventListener('change',renderAll);
renderSectionSelector();
