// Score editor: tap the staff to place notes/rests, then play them back.
(function(){
const ROW=150,ST=5,PITCH=[0,2,4,5,7,9,11];
let dur=1,rest=false,acc=0,erase=false,hl=-1,AC=null,tms=[],lay=null;

const css=document.createElement('style');
css.textContent='#scorebar{display:flex;gap:6px;padding:8px;flex-wrap:wrap;align-items:center;border-top:1px solid var(--line)}'+
'#scorewrap{max-height:240px;overflow:auto;border-top:1px solid var(--line)}'+
'#sc{position:static;display:block;width:100%;touch-action:pan-y}#bpm{width:64px;font-size:15px;padding:6px;border:1px solid var(--line);border-radius:8px}';
document.head.appendChild(css);

const bar=document.createElement('div');bar.id='scorebar';
bar.innerHTML='<b>Score</b>'+
'<button data-d="4">Whole</button><button data-d="2">Half</button><button data-d="1" class="on">Quarter</button><button data-d="0.5">Eighth</button><button data-d="0.25">16th</button>'+
'<button id="restB">Rest</button><button data-a="1">\u266F</button><button data-a="-1">\u266D</button>'+
'<button id="scErase">Erase</button><button id="scUndo">Undo</button><button id="scClear">Clear</button>'+
'<button id="scPlay">\u25B6 Play</button><input id="bpm" type="number" min="30" max="300" value="100"> BPM';
const wrap=document.createElement('div');wrap.id='scorewrap';wrap.innerHTML='<canvas id="sc"></canvas>';
$('#bar').before(bar,wrap);
const sc=$('#sc'),c=sc.getContext('2d');

bar.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{dur=+b.dataset.d;bar.querySelectorAll('[data-d]').forEach(x=>x.classList.toggle('on',x===b))});
bar.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{acc=acc===+b.dataset.a?0:+b.dataset.a;bar.querySelectorAll('[data-a]').forEach(x=>x.classList.toggle('on',+x.dataset.a===acc))});
$('#restB').onclick=e=>{rest=!rest;e.target.classList.toggle('on',rest)};
$('#scErase').onclick=e=>{erase=!erase;e.target.classList.toggle('on',erase)};
$('#scUndo').onclick=()=>{cur.score.ev.pop();changed()};
$('#scClear').onclick=()=>{if(confirm('Clear the score?')){cur.score.ev=[];changed()}};
$('#bpm').onchange=e=>{cur.score.bpm=+e.target.value||100;save()};

function changed(){cur.t=Date.now();renderList();save();drawScore()}
const midi=(s,a)=>{const dn=s+30;return 12*(Math.floor(dn/7)+1)+PITCH[dn%7]+a};
const rs=r=>r?52:74;

function layout(W){
  const pos=[];let row=0,x=rs(0),beat=0,next=4;
  cur.score.ev.forEach((e,i)=>{
    const w=26+22*Math.sqrt(e.d);
    if(x+w>W-14&&x>rs(row)){row++;x=rs(row)}
    const p={i,row,x:x+w/2,w,bar:false};pos.push(p);
    x+=w;beat+=e.d;
    if(beat>=next-1e-6){p.bar=true;x+=12;while(next<=beat+1e-6)next+=4}
  });
  return{pos,rows:row+1};
}

function clef(cx,y0){
  c.strokeStyle='#111';c.lineWidth=2.2;c.beginPath();
  c.moveTo(cx,y0+8);c.lineTo(cx,y0-44);
  c.moveTo(cx,y0+8);c.bezierCurveTo(cx,y0+16,cx-9,y0+16,cx-8,y0+10);
  c.moveTo(cx,y0-44);c.bezierCurveTo(cx+10,y0-50,cx+12,y0-34,cx,y0-24);
  c.moveTo(cx,y0-24);c.bezierCurveTo(cx-17,y0-20,cx-14,y0+3,cx+2,y0+2);
  c.bezierCurveTo(cx+13,y0+1,cx+14,y0-15,cx+3,y0-15);c.bezierCurveTo(cx-4,y0-15,cx-4,y0-7,cx+1,y0-7);
  c.stroke();
}

function drawRest(e,x,y0){
  if(e.d===4)c.fillRect(x-6,y0-30,12,5);
  else if(e.d===2)c.fillRect(x-6,y0-25,12,5);
  else if(e.d===1){c.lineWidth=2.5;c.beginPath();c.moveTo(x-3,y0-38);c.lineTo(x+3,y0-30);c.lineTo(x-3,y0-22);c.lineTo(x+3,y0-14);c.lineTo(x-1,y0-9);c.stroke()}
  else{
    c.lineWidth=2;c.beginPath();c.moveTo(x+3,y0-30);c.lineTo(x-3,y0-10);c.stroke();
    c.beginPath();c.arc(x-3,y0-26,2.5,0,7);c.fill();
    if(e.d<0.5){c.beginPath();c.moveTo(x+5,y0-38);c.lineTo(x-1,y0-18);c.stroke();c.beginPath();c.arc(x-1,y0-34,2.5,0,7);c.fill()}
  }
}

function drawNote(e,x,y0){
  const y=y0-e.s*ST;
  c.lineWidth=1.2;
  for(let s=-2;s>=e.s;s-=2){const yy=y0-s*ST;c.beginPath();c.moveTo(x-11,yy);c.lineTo(x+11,yy);c.stroke()}
  for(let s=10;s<=e.s;s+=2){const yy=y0-s*ST;c.beginPath();c.moveTo(x-11,yy);c.lineTo(x+11,yy);c.stroke()}
  if(e.a){c.font='bold 20px serif';c.textAlign='center';c.textBaseline='middle';c.fillText(e.a>0?'\u266F':'\u266D',x-15,y)}
  c.beginPath();c.ellipse(x,y,6.5,4.6,-0.35,0,7);
  if(e.d>=2){c.lineWidth=1.8;c.stroke()}else c.fill();
  if(e.d>=4)return;
  const up=e.s<4,sx=up?x+6:x-6,dir=up?1:-1,ty=y-dir*32;
  c.lineWidth=1.6;c.beginPath();c.moveTo(sx,y);c.lineTo(sx,ty);c.stroke();
  const flags=e.d===0.5?1:e.d===0.25?2:0;
  for(let k=0;k<flags;k++){
    const o=k*6;c.lineWidth=2;c.beginPath();c.moveTo(sx,ty+dir*o);
    c.bezierCurveTo(sx+4,ty+dir*(o+6),sx+10,ty+dir*(o+10),sx+8,ty+dir*(o+17));c.stroke();
  }
}

function drawScore(){
  if(!cur||!cur.score)return;
  const W=wrap.clientWidth||600,d=window.devicePixelRatio||1;
  lay=layout(W);const H=lay.rows*ROW;
  sc.style.height=H+'px';sc.width=W*d;sc.height=H*d;
  c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,W,H);c.lineCap='round';c.lineJoin='round';
  for(let r=0;r<lay.rows;r++){
    const y0=r*ROW+95;
    c.strokeStyle='#111';c.fillStyle='#111';c.lineWidth=1;
    for(let k=0;k<5;k++){c.beginPath();c.moveTo(8,y0-k*10);c.lineTo(W-8,y0-k*10);c.stroke()}
    c.beginPath();c.moveTo(8,y0);c.lineTo(8,y0-40);c.stroke();
    clef(26,y0);
    if(r===0){c.font='bold 22px serif';c.textAlign='center';c.textBaseline='middle';c.fillText('4',58,y0-30);c.fillText('4',58,y0-10)}
  }
  lay.pos.forEach(p=>{
    const e=cur.score.ev[p.i],y0=p.row*ROW+95;
    c.strokeStyle=c.fillStyle=p.i===hl?'#5b4bdb':'#111';
    if(e.r)drawRest(e,p.x,y0);else drawNote(e,p.x,y0);
    if(p.bar){c.strokeStyle='#111';c.lineWidth=1.2;const bx=p.x+p.w/2+6;c.beginPath();c.moveTo(bx,y0);c.lineTo(bx,y0-40);c.stroke()}
  });
}

sc.addEventListener('click',e=>{
  if(!cur||!lay)return;
  const r=sc.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
  const row=Math.max(0,Math.min(lay.rows-1,Math.floor(y/ROW))),y0=row*ROW+95,ev=cur.score.ev;
  if(erase){const p=lay.pos.find(p=>p.row===row&&Math.abs(x-p.x)<p.w/2);if(p){ev.splice(p.i,1);changed()}return}
  const step=Math.max(-6,Math.min(14,Math.round((y0-y)/ST)));
  let idx=0;
  for(const p of lay.pos){if(p.row<row)idx=p.i+1;else if(p.row===row){if(x<p.x){idx=p.i;break}idx=p.i+1}}
  const n={d:dur,r:rest,s:step,a:rest?0:acc};
  ev.splice(idx,0,n);
  if(!rest)ping(midi(step,n.a));
  changed();
});

function ensureAC(){AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume()}
function tone(m,t,len){
  const o=AC.createOscillator(),g=AC.createGain();
  o.type='triangle';o.frequency.value=440*Math.pow(2,(m-69)/12);
  g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(0.3,t+0.01);g.gain.exponentialRampToValueAtTime(0.001,t+len*0.95);
  o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+len);
}
function ping(m){ensureAC();tone(m,AC.currentTime,0.35)}
function stopPlay(){
  tms.forEach(clearTimeout);tms=[];hl=-1;
  if(AC){try{AC.close()}catch(e){}AC=null}
  $('#scPlay').textContent='\u25B6 Play';drawScore();
}
$('#scPlay').onclick=()=>{
  if(tms.length){stopPlay();return}
  const ev=cur.score.ev;if(!ev.length)return;
  ensureAC();
  const spb=60/Math.max(30,Math.min(300,+$('#bpm').value||100)),t0=AC.currentTime;
  let t=t0+0.1;
  ev.forEach((e,i)=>{
    if(!e.r)tone(midi(e.s,e.a),t,e.d*spb);
    tms.push(setTimeout(()=>{hl=i;drawScore()},(t-t0)*1000));
    t+=e.d*spb;
  });
  tms.push(setTimeout(stopPlay,(t-t0)*1000+100));
  $('#scPlay').textContent='\u25A0 Stop';
};

window.scoreLoad=function(){
  cur.score=cur.score||{ev:[],bpm:100};
  $('#bpm').value=cur.score.bpm;
  stopPlay();
};
addEventListener('resize',()=>{if(cur&&cur.score)drawScore()});
})();
