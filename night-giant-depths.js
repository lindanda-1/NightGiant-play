// The three deeper rooms share an on-demand scene. Its geometry and materials
// are owned by the room and released whenever the lifecycle leaves it.
const deepCenters={5:-130,6:-164,7:-198};
let deepRoom=null;
const nestCombat={hp:5,damage:1,slamRange:3.75,slamStun:1800,flameStun:530,flameRange:7.15};

function onDepthAction(){
  if(!deepRoom||finished||afterStory||deepRoom.fall) return;
  const item=nearDepthControl();
  if(item) item.activate();
}

function nearDepthControl(){
  return deepRoom.controls.find(c=>Math.hypot(hero.position.x-c.x,hero.position.z-deepRoom.z-c.z)<1.55&&!c.used());
}
function refreshDepthAction(){
  const item=nearDepthControl();
  const hidden=!item||Boolean(deepRoom.fall);
  if(depthAction.hidden!==hidden) depthAction.hidden=hidden;
  if(item&&depthAction.textContent!==item.label) depthAction.textContent=item.label;
}

function depthBox(parent,w,h,d,x,y,z,material){
  const object=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  object.position.set(x,y,z);
  parent.add(object);
  return object;
}

function buildDepthRoom(level){
  const group=new THREE.Group(), decor=new THREE.Group();
  group.position.z=deepCenters[level];
  group.add(decor);
  scene.add(group);
  const fog=scene.fog;
  // The earlier rooms keep their original fog. Restore it on exit.
  scene.fog=new THREE.Fog(fog.color,22,52);
  const room={group,decor,z:group.position.z,controls:[],materials:[],fall:null,fog};
  const palette=level===5?[0x313951,0xc48242,0xffcc71]:
    level===6?[0x232a52,0x7552b9,0x81fff3]:[0x3d354e,0x85556d,0xff9764];
  room.stone=depthMaterial(room,new THREE.MeshStandardMaterial({color:palette[0],roughness:.86}));
  room.trim=depthMaterial(room,new THREE.MeshStandardMaterial({color:palette[1],roughness:.44,metalness:.32}));
  room.light=depthMaterial(room,new THREE.MeshBasicMaterial({color:palette[2],toneMapped:false}));
  room.dark=depthMaterial(room,new THREE.MeshStandardMaterial({color:0x161d32,roughness:.91}));
  const wash=new THREE.PointLight(palette[2],26,21,2);
  wash.position.set(0,5,0);
  group.add(wash);
  return room;
}
function depthMaterial(room,material){
  room.materials.push(material);
  return material;
}

function releaseDepthRoom(){
  if(!deepRoom) return;
  depthAction.hidden=true;
  scene.fog=deepRoom.fog;
  scene.remove(deepRoom.group);
  deepRoom.group.traverse(object=>object.geometry?.dispose());
  for(const material of deepRoom.materials) material.dispose();
  deepRoom=null;
  hero.position.y=0;
}

function depthGate(room,z){
  const {decor,stone,trim,group}=room;
  depthBox(decor,4.4,.38,.8,0,3.65,z,trim);
  for(const x of [-1.95,1.95]) depthBox(decor,.65,3.5,.75,x,1.75,z,stone);
  return depthBox(group,3.15,3.2,.35,0,1.6,z,stone);
}
function liftDepthGate(room,dt){
  room.gate.position.y=Math.min(5.25,room.gate.position.y+dt*3.8);
  return room.gate.position.y>4.2;
}

function startDepthFall(){
  if(deepRoom.fall) return;
  deepRoom.fall={elapsed:0};
  resetInput();
  depthAction.hidden=true;
  cue('depth-fall');
}
function updateDepthFall(dt){
  if(!deepRoom.fall) return false;
  deepRoom.fall.elapsed+=dt;
  hero.position.y=-10*deepRoom.fall.elapsed**2;
  if(deepRoom.fall.elapsed>=.55) failLevel(stage);
  return true;
}

function depthTile(room,x,z,w,d){
  depthBox(room.decor,w,.3,d,x,-.16,z,room.stone);
  for(const edge of [-1,1]) depthBox(room.decor,w,.032,.10,x,.012,z+edge*(d/2-.10),room.trim);
}

const bridgeDecks=[
  {z:4.5,length:5.12,start:-5,switchX:-4.8,switchZ:9},
  {z:-5,length:6.12,start:5,switchX:1.8,switchZ:-.4}
];
function enterMechanicalRoom(){
  const room=deepRoom=buildDepthRoom(5);
  const {decor,trim,stone,light,group}=room;
  room.gears=[];
  depthTile(room,0,11,17,8);
  depthTile(room,0,0,5,4);
  depthTile(room,0,-11.5,17,7);
  depthBox(decor,18,.22,31,0,-3.42,0,room.dark);
  for(const x of [-8.85,8.85]){
    depthBox(decor,.64,1.10,30,x,.49,0,stone);
    depthBox(decor,.76,.12,30,x,1.06,0,trim);
    for(const z of [-10,-4,2,8]) depthBox(decor,.12,.35,1.2,x*.96,.78,z,light);
  }
  for(const [i,x] of [-6.9,6.9,-6.9,6.9].entries()){
    const gear=new THREE.Group();
    gear.position.set(x,2.85,i<2?-7.8:6.7);
    group.add(gear);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(1.62,.13,6,32),trim);
    gear.add(rim);
    for(let t=0;t<12;t++){
      const a=t*Math.PI/6;
      depthBox(gear,.31,.43,.27,Math.sin(a)*1.72,Math.cos(a)*1.72,0,trim).rotation.z=-a;
    }
    for(let n=0;n<3;n++) depthBox(gear,.23,3.05,.22,0,0,0,stone).rotation.z=n*Math.PI/3;
    depthBox(gear,.52,.52,.35,0,0,0,light).rotation.z=Math.PI/4;
    mergeByMaterial(gear,false,false);
    room.gears.push(gear);
  }
  room.decks=bridgeDecks.map((config,index)=>{
    const {z,length,start,switchX,switchZ}=config;
    const platform=new THREE.Group();
    platform.position.set(start,-.18,z);
    group.add(platform);
    depthBox(platform,3.5,.36,length,0,0,0,trim);
    for(const x of [-1.62,1.62]) depthBox(platform,.12,.045,length-.16,x,.20,0,light);
    const pedestal=depthBox(group,1.12,.66,1.12,switchX,.33,switchZ,stone);
    depthBox(decor,.64,.26,.64,switchX,.75,switchZ,light).rotation.y=Math.PI/4;
    const deck={platform,z,length,powered:false};
    room.controls.push({x:switchX,z:switchZ,label:'转动齿轮',used:()=>deck.powered,activate:()=>{
      deck.powered=true;
      pedestal.material=trim;
      cue('depth-gear');
      toast(index===0?'第一段桥正在对准中间石台。':'第二段桥正在对准出口。');
    }});
    return deck;
  });
  room.gate=depthGate(room,-14.55);
  mergeByMaterial(decor,true,false);
  hero.position.set(0,0,room.z+12.6);
  tip.textContent='靠近金色机关后点击「转动齿轮」或按 E。等桥板对准再走，先到中间石台，再接通出口。';
  toast('第五关 · 机械深渊');
  updateMechanicalRoom(0);
}
function platformAt(room,x,z){
  return room.decks.find(deck=>Math.abs(z-deck.z)<=deck.length/2&&Math.abs(x-deck.platform.position.x)<=1.75);
}
function moveMechanical(dx,dz){
  const room=deepRoom;
  if(room.fall) return 0;
  const p=hero.position;
  const x=THREE.MathUtils.clamp(p.x+dx,-8.24,8.24);
  const z=THREE.MathUtils.clamp(p.z-room.z+dz,-14.75,14.65);
  if(z<-13.55&&(!room.open||room.gate.position.y<=4.2||Math.abs(x)>1.13)) return 0;
  p.set(x,0,room.z+z);
  const bank=z>=7||z<=-8||Math.abs(z)<=2&&Math.abs(x)<=2.5;
  if(!bank&&!platformAt(room,x,z)) startDepthFall();
  return 1;
}
function updateMechanicalRoom(dt){
  if(updateDepthFall(dt)) return;
  const room=deepRoom;
  room.gears.forEach((gear,i)=>{gear.rotation.z+=dt*(i%2?-.37:.32)});
  for(const deck of room.decks){
    if(!deck.powered) continue;
    const before=deck.platform.position.x;
    const rider=platformAt(room,hero.position.x,hero.position.z-room.z)===deck;
    deck.platform.position.x=THREE.MathUtils.lerp(before,0,Math.min(dt*2.5,1));
    if(Math.abs(deck.platform.position.x)<.035) deck.platform.position.x=0;
    if(rider) hero.position.x+=deck.platform.position.x-before;
  }
  const aligned=room.decks.filter(deck=>deck.powered&&deck.platform.position.x===0).length;
  if(room.shownProgress!==aligned){
    room.shownProgress=aligned;
    progress.textContent='第 5 / 10 关 · 断桥接通 '+aligned+' / 2';
  }
  if(aligned===2&&!room.open){room.open=true;cue('door');}
  if(room.open&&liftDepthGate(room,dt)&&hero.position.z-room.z<-14.15) completeLevel(5);
  refreshDepthAction();
}

// The glass cells shimmer with orange ripples and do not support the player.
// Rows read from the entrance towards the exit.
const crystalMaze=[
  '####S####',
  '#A.....~#',
  '###.#.#.#',
  '#...#..B#',
  '#.###.###',
  '#~....#C#',
  '####....#',
  '###..~###',
  '####E####'
];
const caveStep=2.85;
function cavePoint(col,row){return [(col-4)*caveStep,(4-row)*caveStep];}
function caveCell(x,z){
  const row=Math.round(4-z/caveStep),col=Math.round(4+x/caveStep);
  return crystalMaze[row]?.[col]??'#';
}
function enterCrystalRoom(){
  const room=deepRoom=buildDepthRoom(6);
  const {decor,trim,stone,light,group}=room;
  room.crystals=[];
  const glass=depthMaterial(room,new THREE.MeshBasicMaterial({
    color:0xf78359,transparent:true,opacity:.26,depthWrite:false,toneMapped:false
  }));
  depthBox(decor,26,.20,26,0,-2.92,0,room.dark);
  for(const [row,line] of crystalMaze.entries()){
    for(const [col,tile] of [...line].entries()){
      const [x,z]=cavePoint(col,row);
      if(tile==='#'){
        depthBox(decor,caveStep-.06,.88,caveStep-.06,x,.42,z,room.dark);
        depthBox(decor,caveStep-.24,.22,caveStep-.24,x,.98,z,stone);
        if((row+col)%3===0){
          const mineral=new THREE.Mesh(new THREE.OctahedronGeometry(.59),trim);
          mineral.position.set(x,1.45,z);
          mineral.scale.y=1.65;
          decor.add(mineral);
        }
      }else if(tile==='~'){
        depthBox(decor,2.74,.07,2.74,x,-.04,z,glass);
        for(const offset of [-.67,0,.67]){
          depthBox(decor,2.4,.012,.052,x,.024,z+offset,glass).rotation.y=Math.PI/8;
        }
      }else{
        depthTile(room,x,z,caveStep,caveStep);
        depthBox(decor,.70,.03,.065,x,.025,z,light);
        if(!'ABC'.includes(tile)) continue;
        const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.54),trim);
        crystal.position.set(x,1.10,z);
        crystal.scale.y=1.40;
        group.add(crystal);
        const pedestal=depthBox(group,.78,.37,.78,x,.18,z,trim);
        const state={crystal,lit:false};
        room.crystals.push(state);
        room.controls.push({x,z,label:'唤醒水晶',used:()=>state.lit,activate:()=>{
          state.lit=true;
          crystal.material=pedestal.material=light;
          cue('depth-chime');
          toast('水晶照亮了石路。');
        }});
      }
    }
  }
  room.glass=glass;
  room.gate=depthGate(room,-12.35);
  mergeByMaterial(decor,true,false);
  hero.position.set(0,0,room.z+11.35);
  tip.textContent='沿有青光刻痕的石路探索，橙光闪动的幻路会塌落。靠近三枚水晶后点击或按 E 唤醒。';
  toast('第六关 · 幻影晶窟');
  updateCrystalRoom(0,performance.now());
}
function moveCrystal(dx,dz){
  const room=deepRoom;
  if(room.fall) return 0;
  const p=hero.position;
  const step=(x,z)=>{
    const local=z-room.z;
    if(local<-11.8&&(!room.open||room.gate.position.y<=4.2)) return 0;
    const radius=.37;
    if([[radius,0],[-radius,0],[0,radius],[0,-radius]].some(([a,b])=>caveCell(x+a,local+b)==='#')) return 0;
    if(Math.hypot(x-p.x,z-p.z)<1e-6) return 0;
    p.set(x,0,z);
    if(caveCell(x,local)==='~') startDepthFall();
    return 1;
  };
  return step(p.x+dx,p.z+dz)||step(p.x+dx,p.z)||step(p.x,p.z+dz);
}
function updateCrystalRoom(dt,now){
  if(updateDepthFall(dt)) return;
  const room=deepRoom;
  room.glass.opacity=.20+.09*Math.sin(now*.004);
  for(const item of room.crystals) item.crystal.rotation.y+=dt*(item.lit?1.2:.47);
  const lit=room.crystals.filter(c=>c.lit).length;
  if(room.shownProgress!==lit){
    room.shownProgress=lit;
    progress.textContent='第 6 / 10 关 · 水晶 '+lit+' / 3';
  }
  if(lit===3&&!room.open){room.open=true;cue('door');}
  if(room.open&&liftDepthGate(room,dt)&&hero.position.z-room.z<-12.35) completeLevel(6);
  refreshDepthAction();
}

function nestEnemy(room,kind){
  const body=new THREE.Group();
  const {group,stone,light,trim}=room;
  group.add(body);
  const core=new THREE.Mesh(kind==='ram'?new THREE.IcosahedronGeometry(1.0,1):new THREE.OctahedronGeometry(1.08),stone);
  core.position.y=1.11;
  core.scale.set(1.17,1,1.26);
  body.add(core);
  for(const side of [-1,1]){
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.16,8,6),light);
    eye.position.set(side*.45,1.28,1.02);
    body.add(eye);
    if(kind==='ram'){
      const horn=new THREE.Mesh(new THREE.ConeGeometry(.28,1.16,7),trim);
      horn.position.set(side*.69,1.79,.4);
      horn.rotation.z=side*-.48;
      body.add(horn);
    }else{
      for(const z of [-.68,0,.68]){
        const limb=depthBox(body,1.26,.19,.20,side*1.00,.59,z,trim);
        limb.rotation.z=-side*.52;
      }
      const spine=new THREE.Mesh(new THREE.ConeGeometry(.35,1.18,6),light);
      spine.position.set(side*.52,2,.08);
      body.add(spine);
    }
  }
  return body;
}
function enterNestRoom(){
  const room=deepRoom=buildDepthRoom(7);
  const {decor,group,stone,trim,light}=room;
  depthTile(room,0,0,18,28);
  for(const side of [-1,1]){
    depthBox(decor,.62,1.22,28,side*8.75,.57,0,stone);
    for(let z=-11;z<=11;z+=5.5){
      depthBox(decor,.77,2.7,.86,side*8.52,1.32,z,trim);
      depthBox(decor,.24,.33,.27,side*8.10,2.47,z,light);
    }
  }
  room.gate=depthGate(room,-13.6);
  const warningMaterial=depthMaterial(room,new THREE.MeshBasicMaterial({
    color:0xff794e,transparent:true,opacity:.48,depthWrite:false,toneMapped:false
  }));
  room.line=depthBox(group,1.75,.025,6.5,0,.039,0,warningMaterial);
  room.ring=new THREE.Mesh(new THREE.RingGeometry(3.90,4.07,44),warningMaterial);
  room.ring.rotation.x=-Math.PI/2;
  room.ring.position.y=.045;
  group.add(room.ring);
  room.line.visible=room.ring.visible=false;
  room.warningMaterial=warningMaterial;
  room.phase=0;
  room.enemies=[{kind:'ram',body:nestEnemy(room,'ram'),hp:3},
    {kind:'pulse',body:nestEnemy(room,'pulse'),hp:4}];
  room.enemies[1].body.visible=false;
  room.grace=performance.now()+1300;
  heroHp=nestCombat.hp;
  refreshHealth();
  hero.position.set(0,0,room.z+9.8);
  skills.style.display='';
  aimMarker.visible=true;
  beginNestPhase(0,performance.now());
  mergeByMaterial(decor,true,false);
  toast('第七关 · 深渊兽巢');
}
function beginNestPhase(phase,now){
  const room=deepRoom;
  room.phase=phase;
  const beast=room.enemy=room.enemies[phase];
  beast.body.position.set(phase?1.8:0,0,phase?-6:-2);
  beast.body.visible=true;
  beast.mode='pursue';beast.until=now+1100;beast.slide=0;
  tip.textContent=phase?'晶背兽蓄力时会亮起圆环。退到环外，或用震地打断。':
    '岩角兽会沿橙色预警冲撞。侧移躲避，或用石甲反震；暗焰和震地都能打断。';
  showNestStatus();
}
function showNestStatus(){
  const room=deepRoom;
  progress.textContent=room.open?'第 7 / 10 关 · 两重守卫已击退 · 穿过石门':
    '第 7 / 10 关 · 守关 '+(room.phase+1)+' / 2 · 守卫 '+room.enemy.hp+' · 生命 '+heroHp+' / 5';
}
function moveNest(dx,dz){
  const room=deepRoom,p=hero.position,enemy=room.enemy;
  const x=THREE.MathUtils.clamp(p.x+dx,-7.75,7.75);
  const z=THREE.MathUtils.clamp(p.z-room.z+dz,-13.85,13.35);
  if(z<-12.15&&(!room.open||room.gate.position.y<=4.2||Math.abs(x)>1.16)) return 0;
  const allowed=(a,b)=>!enemy.hp||
    Math.hypot(a-enemy.body.position.x,b-enemy.body.position.z)>=
    Math.min(1.36,Math.hypot(p.x-enemy.body.position.x,p.z-room.z-enemy.body.position.z))-1e-6;
  const beforeX=p.x,beforeZ=p.z;
  if(allowed(x,z))p.set(x,0,room.z+z);
  else{
    if(allowed(x,p.z-room.z))p.x=x;
    if(allowed(p.x,z))p.z=room.z+z;
  }
  return Math.hypot(p.x-beforeX,p.z-beforeZ)>1e-5?1:0;
}
function moveNestEnemy(enemy,dx,dz){
  const p=enemy.body.position;
  const x=THREE.MathUtils.clamp(p.x+dx,-7.12,7.12);
  const z=THREE.MathUtils.clamp(p.z+dz,-11.9,12.0);
  p.set(x,0,z);
}
function hitNestEnemy(damage,now,stun,shove=false){
  const room=deepRoom,enemy=room.enemy;
  if(!enemy.hp) return;
  enemy.hp=Math.max(0,enemy.hp-damage);
  enemy.mode='stun';enemy.until=now+stun;
  room.line.visible=room.ring.visible=false;
  if(!enemy.hp){
    enemy.body.visible=false;
    enemy.slide=0;
    cue('crystal');
    if(room.phase===0){
      room.nextPhase=now+1250;
      toast('岩角兽已退，晶背兽正在苏醒。');
    }else{
      room.open=true;
      cue('door');
      toast('兽巢石门已开。');
    }
  }else if(shove){
    const p=enemy.body.position;
    const dx=p.x-hero.position.x,dz=p.z-(hero.position.z-room.z),length=Math.hypot(dx,dz);
    enemy.kx=length>.001?dx/length:Math.sin(hero.rotation.y);
    enemy.kz=length>.001?dz/length:Math.cos(hero.rotation.y);
    enemy.slide=.30;
  }
  showNestStatus();
}
function useNestSkill(type,now){
  const room=deepRoom,enemy=room.enemy,p=enemy.body.position;
  const x=p.x-hero.position.x,z=p.z-hero.position.z+room.z;
  if(type==='shield'){wardEffect(now);return;}
  if(type==='slam'){
    slamEffect(now);
    if(Math.hypot(x,z)<nestCombat.slamRange)hitNestEnemy(nestCombat.damage,now,nestCombat.slamStun,true);
    return;
  }
  flameEffect(now);
  const fx=-Math.sin(hero.rotation.y),fz=-Math.cos(hero.rotation.y),ahead=x*fx+z*fz;
  if(ahead>.23&&ahead<nestCombat.flameRange&&Math.abs(x*fz-z*fx)<1.1){
    hitNestEnemy(nestCombat.damage,now,nestCombat.flameStun);
  }
}
function nestAttack(now,contact){
  const room=deepRoom;
  if(now<shieldUntil&&wardCharges>0){
    if(--wardCharges===0)shieldUntil=0;
    if(contact)hitNestEnemy(1,now,1450);
    haptic([20,30,35]);
    cue('impact');
    return;
  }
  if(now<room.grace) return;
  heroHp--;
  refreshHealth();
  showNestStatus();
  haptic([65,35,65]);
  cue('impact');
  room.grace=now+1000;
  if(!heroHp)failLevel(7);
}
function updateNestRoom(dt,now){
  const room=deepRoom;
  if(room.open){
    if(liftDepthGate(room,dt)&&hero.position.z-room.z<-13.1)completeLevel(7);
    return;
  }
  const enemy=room.enemy;
  if(!enemy.hp){
    if(now>=room.nextPhase)beginNestPhase(1,now);
    return;
  }
  const p=enemy.body.position;
  const x=hero.position.x-p.x,z=hero.position.z-room.z-p.z,range=Math.hypot(x,z);
  if(enemy.slide>0){
    const next=Math.max(0,enemy.slide-dt),travel=2.25*(enemy.slide**3-next**3)/.30**3;
    moveNestEnemy(enemy,enemy.kx*travel,enemy.kz*travel);
    enemy.slide=next;
  }
  if(enemy.mode==='stun'||enemy.mode==='recover'){
    if(now>=enemy.until){enemy.mode='pursue';enemy.until=now+775;}
  }else if(enemy.mode==='warn'){
    room.warningMaterial.opacity=.44+.16*Math.sin(now*.020);
    if(now>=enemy.until){
      room.line.visible=room.ring.visible=false;
      if(enemy.kind==='ram'){
        enemy.mode='charge';enemy.until=now+530;
      }else{
        enemy.mode='recover';enemy.until=now+950;
        cue('depth-roar');
        if(range<4.05)nestAttack(now,false);
      }
    }
  }else if(enemy.mode==='charge'){
    moveNestEnemy(enemy,enemy.vx*9.8*dt,enemy.vz*9.8*dt);
    const reached=Math.hypot(hero.position.x-p.x,hero.position.z-room.z-p.z)<1.38;
    if(reached||now>=enemy.until){
      enemy.mode='recover';enemy.until=now+900;
      if(reached)nestAttack(now,true);
    }
  }else if(range>.001){
    const trigger=enemy.kind==='ram'?5.55:3.9;
    enemy.body.rotation.y=Math.atan2(x,z);
    if(range>trigger)moveNestEnemy(enemy,x/range*1.65*dt,z/range*1.65*dt);
    else if(now>=enemy.until){
      enemy.vx=x/range;enemy.vz=z/range;
      enemy.mode='warn';enemy.until=now+(enemy.kind==='ram'?800:1070);
      room.line.rotation.y=enemy.body.rotation.y;
      room.line.position.set(p.x+enemy.vx*3.25,.039,p.z+enemy.vz*3.25);
      room.ring.position.set(p.x,.045,p.z);
      room.line.visible=enemy.kind==='ram';
      room.ring.visible=enemy.kind==='pulse';
      cue('depth-roar');
    }
  }
}
