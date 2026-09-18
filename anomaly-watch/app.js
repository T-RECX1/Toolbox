const TYPE_LABELS={
  'object-relocation':'Object Relocation','object-rotation':'Object Rotation','missing-object':'Missing Object','new-object':'New Object','structural-change':'Structural Change','lighting-change':'Lighting Change','surface-change':'Surface Change','misplaced-shadow':'Misplaced Shadow','entity-presence':'Entity Presence'
};
const TYPES=Object.keys(TYPE_LABELS);
const IMG=window.IMG_DATA||{};
const rooms=[
  {id:'back-patio',name:'Back Patio',cam:'CAM-01',src:IMG["back-patio"],a:[
    ['lighting-change','medium',{k:'light',x:.50,y:.15,w:.22,h:.18,s:.68}],['surface-change','hard',{k:'tint',x:.52,y:.54,w:.22,h:.10,c:'rgba(90,20,25,.46)'}],['misplaced-shadow','extreme',{k:'shadow',x:.55,y:.27,w:.12,h:.25,a:.22}],['new-object','hard',{k:'object',x:.78,y:.45,w:.035,h:.11,c:'#111'}],['entity-presence','hard',{k:'entity',x:.18,y:.28,s:.36}],['object-relocation','hard',{k:'move',sx:.28,sy:.45,sw:.08,sh:.05,dx:.43,dy:.45}]
  ]},
  {id:'living-room',name:'Living Room',cam:'CAM-02',src:IMG["living-room"],a:[
    ['object-rotation','hard',{k:'rotate',x:.33,y:.38,w:.09,h:.08,d:26}],['lighting-change','medium',{k:'glow',x:.72,y:.48,w:.12,h:.10,c:'rgba(220,120,45,.22)'}],['surface-change','hard',{k:'tint',x:.49,y:.32,w:.13,h:.22,c:'rgba(65,85,100,.35)'}],['misplaced-shadow','extreme',{k:'shadow',x:.13,y:.42,w:.11,h:.28,a:.2}],['entity-presence','hard',{k:'entity',x:.14,y:.43,s:.30}],['missing-object','hard',{k:'cover',x:.33,y:.38,w:.09,h:.08,ox:-.10,oy:0}]
  ]},
  {id:'kitchen',name:'Kitchen',cam:'CAM-03',src:IMG["kitchen"],a:[
    ['new-object','medium',{k:'cup',x:.53,y:.56,s:.9}],['lighting-change','hard',{k:'light',x:.26,y:.20,w:.35,h:.28,s:.60}],['surface-change','hard',{k:'tint',x:.28,y:.53,w:.43,h:.18,c:'rgba(35,70,90,.18)'}],['misplaced-shadow','extreme',{k:'shadow',x:.80,y:.34,w:.09,h:.28,a:.20}],['entity-presence','hard',{k:'entity',x:.82,y:.35,s:.28}],['missing-object','hard',{k:'cover',x:.60,y:.48,w:.12,h:.08,ox:-.13,oy:0}]
  ]},
  {id:'office',name:'Office',cam:'CAM-04',src:IMG["office"],a:[
    ['lighting-change','medium',{k:'glow',x:.23,y:.56,w:.20,h:.17,c:'rgba(40,80,120,.2)'}],['surface-change','hard',{k:'tint',x:.52,y:.31,w:.20,h:.18,c:'rgba(85,20,25,.35)'}],['misplaced-shadow','extreme',{k:'shadow',x:.77,y:.31,w:.12,h:.32,a:.21}],['entity-presence','hard',{k:'entity',x:.77,y:.31,s:.32}],['new-object','hard',{k:'object',x:.67,y:.70,w:.045,h:.045,c:'#090909'}],['object-relocation','hard',{k:'move',sx:.56,sy:.45,sw:.07,sh:.06,dx:.70,dy:.45}]
  ]},
  {id:'dining-room',name:'Dining Room',cam:'CAM-05',src:IMG["dining-room"],a:[
    ['object-rotation','hard',{k:'rotate',x:.51,y:.49,w:.13,h:.08,d:35}],['surface-change','hard',{k:'tint',x:.57,y:.24,w:.28,h:.23,c:'rgba(40,60,90,.34)'}],['misplaced-shadow','extreme',{k:'shadow',x:.73,y:.31,w:.10,h:.30,a:.18}],['entity-presence','hard',{k:'entity',x:.76,y:.35,s:.28}],['new-object','medium',{k:'cup',x:.49,y:.56,s:.75}],['missing-object','hard',{k:'cover',x:.48,y:.49,w:.16,h:.12,ox:-.16,oy:0}]
  ]},
  {id:'storage-closet',name:'Storage',cam:'CAM-06',src:IMG["storage-closet"],a:[
    ['lighting-change','medium',{k:'light',x:.12,y:.20,w:.40,h:.55,s:.55}],['surface-change','hard',{k:'tint',x:.31,y:.41,w:.28,h:.18,c:'rgba(80,20,30,.35)'}],['misplaced-shadow','extreme',{k:'shadow',x:.31,y:.15,w:.11,h:.42,a:.22}],['entity-presence','hard',{k:'entity',x:.33,y:.22,s:.28}],['new-object','hard',{k:'object',x:.55,y:.70,w:.045,h:.055,c:'#111'}],['missing-object','hard',{k:'cover',x:.36,y:.74,w:.25,h:.12,ox:0,oy:-.14}]
  ]},
  {id:'utility-room',name:'Utility',cam:'CAM-07',src:IMG["utility-room"],a:[
    ['lighting-change','medium',{k:'light',x:.08,y:.26,w:.34,h:.47,s:.60}],['surface-change','hard',{k:'tint',x:.50,y:.55,w:.32,h:.14,c:'rgba(45,70,90,.28)'}],['misplaced-shadow','extreme',{k:'shadow',x:.20,y:.35,w:.11,h:.34,a:.22}],['new-object','medium',{k:'cup',x:.71,y:.62,s:.65}],['entity-presence','hard',{k:'entity',x:.19,y:.38,s:.28}],['missing-object','hard',{k:'cover',x:.68,y:.35,w:.08,h:.08,ox:-.10,oy:0}]
  ]},
  {id:'bathroom-a',name:'Bathroom A',cam:'CAM-08',src:IMG["bathroom-a"],a:[
    ['lighting-change','hard',{k:'light',x:.57,y:.16,w:.35,h:.60,s:.66}],['surface-change','hard',{k:'tint',x:.58,y:.31,w:.35,h:.44,c:'rgba(50,70,85,.28)'}],['misplaced-shadow','medium',{k:'hand',x:.78,y:.57,s:.8}],['entity-presence','hard',{k:'curtainEntity',x:.76,y:.48,s:.34}],['new-object','medium',{k:'object',x:.45,y:.77,w:.04,h:.05,c:'#0c0c0c'}],['missing-object','hard',{k:'cover',x:.34,y:.62,w:.10,h:.10,ox:-.11,oy:0}]
  ]},
  {id:'bathroom-b',name:'Bathroom B',cam:'CAM-09',src:IMG["bathroom-b"],a:[
    ['lighting-change','hard',{k:'light',x:.18,y:.20,w:.38,h:.55,s:.60}],['surface-change','hard',{k:'tint',x:.28,y:.40,w:.32,h:.26,c:'rgba(60,75,90,.28)'}],['misplaced-shadow','extreme',{k:'shadow',x:.57,y:.22,w:.10,h:.40,a:.18}],['entity-presence','hard',{k:'doorEntity',x:.62,y:.37,s:.28}],['new-object','medium',{k:'object',x:.24,y:.62,w:.04,h:.07,c:'#090909'}],['structural-change','hard',{k:'bar',x:.49,y:.50,w:.11,h:.012}]
  ]}
];

const perks=[
  {id:'room',name:'Room Scanner',icon:'◉',cost:4},{id:'type',name:'Type Scanner',icon:'⌁',cost:4},{id:'estimate',name:'Estimator',icon:'?',cost:5},{id:'local',name:'Local Remover',icon:'◆',cost:7},{id:'recall',name:'Temporal Recall',icon:'◀◀',cost:8}
];

const $=s=>document.querySelector(s);const canvas=$('#cameraCanvas'),ctx=canvas.getContext('2d');
const els={boot:$('#boot'),start:$('#startBtn'),rooms:$('#rooms'),types:$('#types'),roomName:$('#roomName'),camCode:$('#camCode'),uptime:$('#uptime'),captured:$('#captured'),credits:$('#credits'),network:$('#network'),message:$('#message'),reportPanel:$('#reportPanel'),reportOpen:$('#reportOpen'),submit:$('#submitReport'),warning:$('#warning'),memorize:$('#memorize'),static:$('#staticFlash'),perks:$('#perks'),pause:$('#pauseOverlay'),gameOver:$('#gameOver'),gameOverStats:$('#gameOverStats')};
const state={started:false,startAt:0,pauseAt:0,pauseAccum:0,paused:false,current:0,selected:null,active:[],captured:0,wrong:0,credits:12,cooldown:0,nextSpawn:0,memorizeMs:30000,gameOver:false,perkQty:Object.fromEntries(perks.map(p=>[p.id,0]))};
const images={};
function loadImages(){return Promise.all(rooms.map(r=>new Promise((res,rej)=>{const im=new Image();im.onload=()=>{images[r.id]=im;res()};im.onerror=()=>{console.warn('Camera failed',r.id);res()};im.src=r.src})));}
function now(){return performance.now()-state.pauseAccum-(state.paused?performance.now()-state.pauseAt:0)}
function elapsed(){return state.started?Math.max(0,now()-state.startAt):0}
function fmt(ms){const s=Math.floor(ms/1000),m=Math.floor(s/60);return `${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}
function room(){return rooms[state.current]}
function activeForRoom(id){return state.active.find(a=>a.roomId===id)}
function rnd(a,b){return a+Math.random()*(b-a)}
function flash(){els.static.classList.remove('on');void els.static.offsetWidth;els.static.classList.add('on');tone(170,.04,true)}

function renderRooms(){els.rooms.innerHTML='';rooms.forEach((r,i)=>{const b=document.createElement('button');b.className='room-btn'+(i===state.current?' active':'');b.innerHTML=`<span class="num">${String(i+1).padStart(2,'0')}</span><span>${r.name}</span>`;b.onclick=()=>switchRoom(i);els.rooms.appendChild(b)})}
function renderTypes(){els.types.innerHTML='';TYPES.forEach(t=>{const b=document.createElement('button');b.className='type-btn'+(state.selected===t?' active':'');b.textContent=TYPE_LABELS[t];b.onclick=()=>{state.selected=t;els.submit.disabled=false;renderTypes()};els.types.appendChild(b)})}
function renderPerks(){els.perks.innerHTML='';perks.forEach(p=>{const b=document.createElement('button');b.className='perk';b.innerHTML=`<span class="icon">${p.icon}</span><span class="name">${p.name}</span><span class="qty">${state.perkQty[p.id]?`x${state.perkQty[p.id]}`:`${p.cost} CR`}</span>`;b.onclick=()=>perkAction(p);els.perks.appendChild(b)})}
function switchRoom(i){if(i===state.current)return;state.current=i;flash();renderRooms();setTimeout(renderCamera,85)}

function dims(im){canvas.width=im.naturalWidth||640;canvas.height=im.naturalHeight||960}
function N(v,max){return Math.round(v*max)}
function coverPatch(r){let x=N(r.x,canvas.width),y=N(r.y,canvas.height),w=N(r.w,canvas.width),h=N(r.h,canvas.height),sx=x+N(r.ox||0,canvas.width),sy=y+N(r.oy||0,canvas.height);sx=Math.max(0,Math.min(canvas.width-w,sx));sy=Math.max(0,Math.min(canvas.height-h,sy));ctx.save();ctx.filter='blur(2px)';ctx.drawImage(canvas,sx,sy,w,h,x,y,w,h);ctx.restore()}
function movePatch(r){let sx=N(r.sx,canvas.width),sy=N(r.sy,canvas.height),sw=N(r.sw,canvas.width),sh=N(r.sh,canvas.height),dx=N(r.dx,canvas.width),dy=N(r.dy,canvas.height);const tmp=document.createElement('canvas');tmp.width=sw;tmp.height=sh;tmp.getContext('2d').drawImage(canvas,sx,sy,sw,sh,0,0,sw,sh);ctx.save();ctx.filter='blur(2px)';ctx.drawImage(canvas,Math.max(0,sx-sw),sy,sw,sh,sx,sy,sw,sh);ctx.restore();ctx.drawImage(tmp,dx,dy)}
function rotatePatch(r){let x=N(r.x,canvas.width),y=N(r.y,canvas.height),w=N(r.w,canvas.width),h=N(r.h,canvas.height);const tmp=document.createElement('canvas');tmp.width=w;tmp.height=h;tmp.getContext('2d').drawImage(canvas,x,y,w,h,0,0,w,h);ctx.save();ctx.filter='blur(2px)';ctx.drawImage(canvas,Math.max(0,x-w),y,w,h,x,y,w,h);ctx.restore();ctx.save();ctx.translate(x+w/2,y+h/2);ctx.rotate((r.d||20)*Math.PI/180);ctx.drawImage(tmp,-w/2,-h/2);ctx.restore()}
function silhouette(x,y,s,a=.48){ctx.save();ctx.globalAlpha=a;ctx.fillStyle='#050505';const W=canvas.width,H=canvas.height;let cx=N(x,W),cy=N(y,H),q=s*W;ctx.beginPath();ctx.ellipse(cx,cy-q*.55,q*.13,q*.17,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(cx,cy,q*.22,q*.55,0,0,Math.PI*2);ctx.fill();ctx.restore()}
function drawRecipe(r){const W=canvas.width,H=canvas.height;ctx.save();
 if(r.k==='light'){let x=N(r.x,W),y=N(r.y,H),w=N(r.w,W),h=N(r.h,H);let g=ctx.createRadialGradient(x+w/2,y+h/2,0,x+w/2,y+h/2,Math.max(w,h));g.addColorStop(0,`rgba(0,0,0,${1-r.s})`);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(x-w*.2,y-h*.2,w*1.4,h*1.4)}
 if(r.k==='tint'){ctx.fillStyle=r.c;ctx.fillRect(N(r.x,W),N(r.y,H),N(r.w,W),N(r.h,H))}
 if(r.k==='shadow'){ctx.globalAlpha=r.a||.2;ctx.filter='blur(12px)';ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(N(r.x,W),N(r.y,H),N(r.w,W),N(r.h,H),-.15,0,Math.PI*2);ctx.fill()}
 if(r.k==='glow'){let x=N(r.x,W),y=N(r.y,H),w=N(r.w,W),h=N(r.h,H);let g=ctx.createRadialGradient(x+w/2,y+h/2,0,x+w/2,y+h/2,w);g.addColorStop(0,r.c);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(x-w,y-h,w*3,h*3)}
 if(r.k==='object'){ctx.fillStyle=r.c||'#111';let x=N(r.x,W),y=N(r.y,H),w=N(r.w,W),h=N(r.h,H);ctx.fillRect(x,y,w,h);ctx.fillStyle='rgba(255,255,255,.08)';ctx.fillRect(x+w*.15,y+h*.08,w*.15,h*.84)}
 if(r.k==='cup'){let x=N(r.x,W),y=N(r.y,H),s=r.s||1,q=W*.026*s;ctx.fillStyle='#5c1e1c';ctx.fillRect(x,y,q,q*1.3);ctx.strokeStyle='rgba(255,255,255,.15)';ctx.lineWidth=Math.max(1,q*.08);ctx.strokeRect(x,y,q,q*1.3)}
 if(r.k==='bar'){ctx.fillStyle='rgba(40,40,40,.85)';ctx.fillRect(N(r.x,W),N(r.y,H),N(r.w,W),Math.max(2,N(r.h,H)))}
 if(r.k==='entity'||r.k==='doorEntity'||r.k==='curtainEntity')silhouette(r.x,r.y,r.s,r.k==='curtainEntity'?.24:.42)
 if(r.k==='hand'){let x=N(r.x,W),y=N(r.y,H),s=(r.s||1)*W*.035;ctx.globalAlpha=.22;ctx.filter='blur(3px)';ctx.fillStyle='#000';ctx.fillRect(x-s*.12,y,s*.24,s*.9);for(let i=-2;i<=2;i++)ctx.fillRect(x+i*s*.22,y-s*.55-Math.abs(i)*s*.08,s*.12,s*.65)}
 ctx.restore();if(r.k==='cover')coverPatch(r);if(r.k==='move')movePatch(r);if(r.k==='rotate')rotatePatch(r)
}
function renderCamera(forceNormal=false){const r=room(),im=images[r.id];ctx.clearRect(0,0,canvas.width,canvas.height);if(im&&im.complete){dims(im);ctx.drawImage(im,0,0)}else{canvas.width=640;canvas.height=960;ctx.fillStyle='#050806';ctx.fillRect(0,0,640,960);ctx.fillStyle='#829087';ctx.font='28px monospace';ctx.fillText('CAMERA SIGNAL LOST',120,470)}const a=!forceNormal&&activeForRoom(r.id);if(a)drawRecipe(a.recipe);els.roomName.textContent=r.name.toUpperCase();els.camCode.textContent=r.cam}

function schedule(){state.nextSpawn=now()+rnd(21000,43000)}
function spawn(){if(state.active.length>=5){schedule();return}const choices=rooms.filter(r=>!activeForRoom(r.id));if(!choices.length){schedule();return}const rr=choices[Math.floor(Math.random()*choices.length)],base=rr.a[Math.floor(Math.random()*rr.a.length)];state.active.push({roomId:rr.id,type:base[0],difficulty:base[1],recipe:base[2],id:String(Math.random())});schedule();if(rr.id===room().id)renderCamera();updateHud()}
function submitReport(){if(performance.now()<state.cooldown)return;const a=activeForRoom(room().id);if(a&&a.type===state.selected){const reward={medium:20,hard:28,extreme:40}[a.difficulty]||20;state.active=state.active.filter(x=>x.id!==a.id);state.captured++;state.credits+=reward;msg(`REPORT ACCEPTED  +${reward} CR`,3600);tone(520,.08);renderCamera()}else{state.wrong++;state.cooldown=performance.now()+8000;els.submit.disabled=true;msg('REPORT FAILED — 8s LOCKOUT',3500);tone(110,.12,true);setTimeout(()=>els.submit.disabled=!state.selected,8000)}updateHud()}
function updateHud(){els.uptime.textContent=`${fmt(elapsed())} UPTIME`;els.captured.textContent=state.captured;els.credits.textContent=state.credits;const n=state.active.length;els.warning.classList.toggle('show',n>=3);if(n<=1){els.network.textContent='STABLE';els.warning.textContent=''}else if(n===2){els.network.textContent='UNSTABLE';els.warning.textContent=''}else if(n===3){els.network.textContent='CRITICAL';els.warning.textContent='SIGNAL INSTABILITY DETECTED'}else{els.network.textContent='FAILURE';els.warning.textContent='TOO MANY ANOMALIES'}if(n>=5&&!state.gameOver)endGame()}
function msg(t,ms=3200){els.message.textContent=t;clearTimeout(msg.t);msg.t=setTimeout(()=>els.message.textContent='',ms)}
function perkAction(p){if(state.perkQty[p.id]){state.perkQty[p.id]--;usePerk(p);renderPerks();return}if(state.credits>=p.cost){state.credits-=p.cost;state.perkQty[p.id]++;msg(`PURCHASED: ${p.name.toUpperCase()}`);updateHud();renderPerks()}else msg('INSUFFICIENT CREDITS')}
function usePerk(p){if(p.id==='room'){if(!state.active.length)return msg('NO CLEAR SIGNAL');const a=state.active[Math.floor(Math.random()*state.active.length)],target=rooms.find(r=>r.id===a.roomId),dec=rooms.filter(r=>r.id!==target.id).sort(()=>Math.random()-.5).slice(0,2);msg(`POSSIBLE ACTIVITY: ${[target,...dec].sort(()=>Math.random()-.5).map(x=>x.name.toUpperCase()).join(' / ')}`,6000)}if(p.id==='type'){if(!state.active.length)return msg('NO CLEAR SIGNAL');const t=state.active[Math.floor(Math.random()*state.active.length)].type;const env=['lighting-change','surface-change','structural-change','misplaced-shadow'].includes(t);msg(env?'ENVIRONMENTAL ALTERATION DETECTED':'PHYSICAL ALTERATION DETECTED',5000)}if(p.id==='estimate'){const n=state.active.length;msg(`NETWORK ESTIMATE: ${Math.max(0,n-1)}–${n+1} ABNORMALITIES`,5000)}if(p.id==='local'){const a=activeForRoom(room().id);if(a){state.active=state.active.filter(x=>x.id!==a.id);state.captured++;msg('LOCAL SIGNAL CLEARED');renderCamera()}else msg('NO TARGET FOUND — CHARGE LOST')}if(p.id==='recall'){renderCamera(true);msg('TEMPORAL RECALL — NORMAL FRAME',2300);setTimeout(renderCamera,2300)}updateHud()}
function endGame(){state.gameOver=true;els.gameOverStats.textContent=`Uptime ${fmt(elapsed())} • ${state.captured} captured • ${state.wrong} failed reports`;els.gameOver.classList.remove('hidden')}
function togglePause(on){if(!state.started||state.gameOver)return;if(on&&!state.paused){state.paused=true;state.pauseAt=performance.now();els.pause.classList.remove('hidden')}else if(!on&&state.paused){state.pauseAccum+=performance.now()-state.pauseAt;state.paused=false;els.pause.classList.add('hidden')}}
let ac;function tone(f=220,d=.06,noise=false){try{ac||=new (AudioContext||webkitAudioContext)();if(noise){const b=ac.createBuffer(1,ac.sampleRate*d,ac.sampleRate),a=b.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*.1;const s=ac.createBufferSource(),g=ac.createGain();s.buffer=b;s.connect(g).connect(ac.destination);g.gain.value=.05;s.start()}else{const o=ac.createOscillator(),g=ac.createGain();o.type='square';o.frequency.value=f;g.gain.value=.018;o.connect(g).connect(ac.destination);o.start();o.stop(ac.currentTime+d)}}catch{}}
function loop(){if(state.started&&!state.paused&&!state.gameOver){const e=elapsed();if(e>=state.memorizeMs){els.memorize.style.display='none';if(!state.nextSpawn)schedule();if(now()>=state.nextSpawn)spawn()}updateHud()}requestAnimationFrame(loop)}
async function start(){await loadImages();state.started=true;state.startAt=now();els.boot.classList.add('hidden');renderRooms();renderTypes();renderPerks();renderCamera();updateHud();loop();tone(260,.07)}
els.start.onclick=start;els.reportOpen.onclick=()=>els.reportPanel.classList.toggle('hidden');els.submit.onclick=submitReport;$('#pauseBtn').onclick=()=>togglePause(true);$('#resumeBtn').onclick=()=>togglePause(false);$('#restartBtn').onclick=()=>location.reload();$('#newGameBtn').onclick=()=>location.reload();
renderRooms();renderTypes();renderPerks();