import * as THREE from 'three';
const $=id=>document.getElementById(id);
const R=300, WATER=0;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const rand=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.floor(Math.random()*a.length)];
function mulberry(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const wr=mulberry(1337);
const wrand=(a,b)=>a+wr()*(b-a);
function hash(x,y){let h=Math.sin(x*127.1+y*311.7)*43758.5453;return h-Math.floor(h)}
function noise(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
 return lerp(lerp(hash(xi,yi),hash(xi+1,yi),u),lerp(hash(xi,yi+1),hash(xi+1,yi+1),u),v)}
function fbm(x,y){let a=1,f=1,s=0,n=0;for(let i=0;i<5;i++){s+=noise(x*f,y*f)*a;n+=a;a*=.5;f*=2}return s/n}
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
function terrainH(x,z){
 const d=Math.hypot(x,z)/R, mask=clamp(1-Math.pow(d,2.6),0,1);
 let h=(fbm(x*.006+10,z*.006+7)*42-9)*mask+(mask-1)*10;
 h-=sstep(.68,.8,noise(x*.011+50,z*.011+20))*13*mask;
 return h;
}

// ---------- renderer / scene
const canvas=$('c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
const scene=new THREE.Scene();
const FOG=0xbcd3e0;
scene.fog=new THREE.FogExp2(FOG,0.0019);
const camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.1,2500);
camera.rotation.order='YXZ';
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()});

// sky dome
{const g=new THREE.SphereGeometry(1800,32,16);
 const m=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
  uniforms:{top:{value:new THREE.Color(0x2f6fc0)},mid:{value:new THREE.Color(0x8fbfe8)},bot:{value:new THREE.Color(FOG)}},
  vertexShader:'varying vec3 p;void main(){p=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying vec3 p;uniform vec3 top,mid,bot;void main(){float h=p.y;vec3 c=h<0.?bot:mix(mix(bot,mid,smoothstep(0.,.18,h)),top,smoothstep(.15,.9,h));gl_FragColor=vec4(c,1.);}'});
 const s=new THREE.Mesh(g,m);s.renderOrder=-10;scene.add(s);window._sky=s}
const hemi=new THREE.HemisphereLight(0xcfe6ff,0x5a6a44,1.7);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff0d6,2.6);
const SUNDIR=new THREE.Vector3(.5,.75,.35).normalize();
sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-70,right:70,top:70,bottom:-70,near:1,far:400});
sun.shadow.bias=-.0004;sun.shadow.normalBias=.4;
scene.add(sun,sun.target);
// sun glow + clouds
function radTex(inner,outer){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
 const g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,inner);g.addColorStop(1,outer);x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c)}
{const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:radTex('rgba(255,250,220,1)','rgba(255,240,200,0)'),fog:false,depthWrite:false,transparent:true}));
 sp.scale.set(420,420,1);sp.position.copy(SUNDIR).multiplyScalar(1500);scene.add(sp)}
const cloudTex=radTex('rgba(255,255,255,.9)','rgba(255,255,255,0)');
const clouds=[];
for(let i=0;i<46;i++){const m=new THREE.SpriteMaterial({map:cloudTex,fog:false,transparent:true,opacity:rand(.5,.85),depthWrite:false});
 const s=new THREE.Sprite(m);const a=Math.random()*6.28,r=rand(100,900);
 s.position.set(Math.cos(a)*r,rand(170,300),Math.sin(a)*r);s.scale.set(rand(160,320),rand(50,90),1);scene.add(s);clouds.push(s)}

// ---------- procedural textures
function ctex(w,h,fn,rep){const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;if(rep)t.repeat.set(rep[0],rep[1]);t.anisotropy=4;t.colorSpace=THREE.SRGBColorSpace;return t}
const grassTex=ctex(512,512,(x,w,h)=>{x.fillStyle='#8a9a7a';x.fillRect(0,0,w,h);
 for(let i=0;i<9000;i++){const v=Math.floor(rand(100,200));x.fillStyle=`rgba(${v-20},${v},${v-50},.35)`;x.fillRect(Math.random()*w,Math.random()*h,rand(1,4),rand(1,4))}},[110,110]);
const woodTex=ctex(256,256,(x,w,h)=>{x.fillStyle='#8b6238';x.fillRect(0,0,w,h);
 for(let i=0;i<8;i++){x.fillStyle=i%2?'#7a5530':'#97693c';x.fillRect(0,i*32,w,32);x.fillStyle='rgba(0,0,0,.35)';x.fillRect(0,i*32,w,2)}
 for(let i=0;i<500;i++){x.fillStyle=`rgba(40,20,5,${Math.random()*.15})`;x.fillRect(Math.random()*w,Math.random()*h,rand(10,60),1)}},[1,1]);
const roofTex=ctex(256,256,(x,w,h)=>{x.fillStyle='#5a3a30';x.fillRect(0,0,w,h);
 for(let r=0;r<8;r++)for(let c=0;c<8;c++){x.fillStyle=`hsl(15,${30+Math.random()*10}%,${22+Math.random()*10}%)`;x.fillRect(c*32+(r%2)*16,r*32,30,30)}},[2,2]);
const stoneTex=ctex(256,256,(x,w,h)=>{x.fillStyle='#8a8a84';x.fillRect(0,0,w,h);
 for(let i=0;i<260;i++){const v=Math.floor(rand(90,170));x.fillStyle=`rgb(${v},${v},${v-6})`;x.beginPath();x.arc(Math.random()*w,Math.random()*h,rand(6,20),0,7);x.fill()}},[2,2]);
const barkTex=ctex(64,128,(x,w,h)=>{x.fillStyle='#4b3a2a';x.fillRect(0,0,w,h);for(let i=0;i<60;i++){x.fillStyle=`rgba(0,0,0,${Math.random()*.4})`;x.fillRect(Math.random()*w,0,rand(1,3),h)}});

// ---------- terrain mesh
const TS=760,TSEG=240;
let terrain;
{const g=new THREE.PlaneGeometry(TS,TS,TSEG,TSEG);g.rotateX(-Math.PI/2);
 const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,terrainH(p.getX(i),p.getZ(i)));
 g.computeVertexNormals();
 const n=g.attributes.normal,col=new Float32Array(p.count*3),c=new THREE.Color();
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),sl=1-n.getY(i);
  const v=noise(x*.05,z*.05);
  if(y<-.2)c.setRGB(.28,.3,.26);
  else if(y<1.1)c.setRGB(.78,.72,.55);
  else{c.setRGB(lerp(.2,.36,v),lerp(.36,.5,v),lerp(.12,.2,v));
   if(y>20)c.lerp(new THREE.Color(.5,.5,.46),sstep(20,30,y));
   if(sl>.12)c.lerp(new THREE.Color(.42,.4,.36),sstep(.12,.3,sl));}
  col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b}
 g.setAttribute('color',new THREE.BufferAttribute(col,3));
 terrain=new THREE.Mesh(g,new THREE.MeshStandardMaterial({map:grassTex,vertexColors:true,roughness:.95}));
 terrain.receiveShadow=true;scene.add(terrain)}
const waterMat=new THREE.MeshPhysicalMaterial({color:0x2b7a96,roughness:.08,metalness:.05,transparent:true,opacity:.82,clearcoat:1});
const water=new THREE.Mesh(new THREE.PlaneGeometry(5000,5000).rotateX(-Math.PI/2),waterMat);water.position.y=WATER;water.receiveShadow=true;scene.add(water);

// ---------- colliders (axis-aligned boxes + circles), spatial grid
const CELL=8, cgrid=new Map(), rgrid=new Map();
const key=(cx,cz)=>cx*4096+cz;
function gAdd(grid,o,x0,x1,z0,z1){for(let cx=Math.floor(x0/CELL);cx<=Math.floor(x1/CELL);cx++)for(let cz=Math.floor(z0/CELL);cz<=Math.floor(z1/CELL);cz++){const k=key(cx,cz);let a=grid.get(k);if(!a){a=[];grid.set(k,a)}a.push(o)}}
function gGet(grid,x,z,r){const out=[];const seen=new Set();for(let cx=Math.floor((x-r)/CELL);cx<=Math.floor((x+r)/CELL);cx++)for(let cz=Math.floor((z-r)/CELL);cz<=Math.floor((z+r)/CELL);cz++){const a=grid.get(key(cx,cz));if(a)for(const o of a)if(!o.dead&&!seen.has(o)){seen.add(o);out.push(o)}}return out}
const buildGroup=new THREE.Group();scene.add(buildGroup);
function topOf(c,x,z){if(!c.ramp)return c.y1;const q=c.ramp;let t;
 if(q.dir==='+x')t=(x-c.x0)/(c.x1-c.x0);else if(q.dir==='-x')t=1-(x-c.x0)/(c.x1-c.x0);
 else if(q.dir==='+z')t=(z-c.z0)/(c.z1-c.z0);else t=1-(z-c.z0)/(c.z1-c.z0);
 return q.lo+clamp(t,0,1)*(q.hi-q.lo)}
function addBoxCollider(x0,x1,z0,z1,y0,y1,mesh,extra){const c={x0,x1,z0,z1,y0,y1,mesh,hp:9999,...extra};gAdd(cgrid,c,x0,x1,z0,z1);return c}
function killCollider(c){c.dead=true;if(c.mesh){c.mesh.parent&&c.mesh.parent.remove(c.mesh)}}
function groundAt(x,z,feetY,step=.7){let h=terrainH(x,z);
 for(const c of gGet(cgrid,x,z,0)){if(x<c.x0||x>c.x1||z<c.z0||z>c.z1)continue;const t=topOf(c,x,z);if(t<=feetY+step&&t>h)h=t}return h}
// push entity (x,z) out of solid stuff; returns true if pushed
function resolve(pos,r,height,step=.7){let hit=false;
 for(const c of gGet(cgrid,pos.x,pos.z,r+.5)){
  const px=clamp(pos.x,c.x0,c.x1),pz=clamp(pos.z,c.z0,c.z1);
  const top=topOf(c,px,pz);if(pos.y+step>=top||pos.y+height<=c.y0)continue;
  let dx=pos.x-px,dz=pos.z-pz,d=Math.hypot(dx,dz);
  if(d<r){hit=true;if(d>1e-5){pos.x+=dx/d*(r-d);pos.z+=dz/d*(r-d)}else{
    const l=pos.x-c.x0,rr=c.x1-pos.x,t=pos.z-c.z0,b=c.z1-pos.z,m=Math.min(l,rr,t,b);
    if(m===l)pos.x=c.x0-r;else if(m===rr)pos.x=c.x1+r;else if(m===t)pos.z=c.z0-r;else pos.z=c.z1+r}}}
 for(const o of gGet(rgrid,pos.x,pos.z,r+2)){if(pos.y>o.y+o.h)continue;const dx=pos.x-o.x,dz=pos.z-o.z,d=Math.hypot(dx,dz),m=r+o.r;
  if(d<m){hit=true;const k=d>1e-5?(m-d)/d:0;pos.x+=dx*k;pos.z+=dz*k}}
 return hit}

// ---------- world props
const matWood=new THREE.MeshStandardMaterial({map:woodTex,roughness:.85});
const matRoof=new THREE.MeshStandardMaterial({map:roofTex,roughness:.9});
const matStone=new THREE.MeshStandardMaterial({map:stoneTex,roughness:.95});
const matDark=new THREE.MeshStandardMaterial({color:0x3a2a1c,roughness:.9});
const boxGeo=new THREE.BoxGeometry(1,1,1);
function mkBox(w,h,d,mat,x,y,z,parent){const m=new THREE.Mesh(boxGeo,mat);m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;(parent||scene).add(m);return m}
const items=[];// ground loot, filled later
const chests=[];
const POIS=[];
function findLand(x,z){for(let r=0;r<120;r+=6)for(let a=0;a<6.28;a+=.5){const px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;
  const h=terrainH(px,pz),hx=terrainH(px+8,pz),hz=terrainH(px,pz+8);
  if(h>3&&h<17&&Math.abs(hx-h)<2&&Math.abs(hz-h)<2&&Math.hypot(px,pz)<R-60)return[px,pz]}return[x,z]}
// cabin: local coordinates rotated by rot*90deg
function addCabin(cx,cz,rot,w,d){
 const gy=Math.max(terrainH(cx-w/2,cz-d/2),terrainH(cx+w/2,cz-d/2),terrainH(cx-w/2,cz+d/2),terrainH(cx+w/2,cz+d/2),terrainH(cx,cz))+.5;
 const cs=Math.cos(rot*Math.PI/2),sn=Math.sin(rot*Math.PI/2);
  const Lf=(lx,lz)=>[cx+lx*cs-lz*sn,cz+lx*sn+lz*cs];
 const swap=rot%2===1;
 function part(lx,lz,bw,bd,y0,y1,mat,collide=true){
  const [x,z]=Lf(lx,lz);const W=swap?bd:bw,D=swap?bw:bd;
  const m=mkBox(W,y1-y0,D,mat,x,(y0+y1)/2,z,buildGroup);
  if(collide)addBoxCollider(x-W/2,x+W/2,z-D/2,z+D/2,y0,y1,null,{});return m}
 // foundation (extends down to hide terrain)
 part(0,0,w+.6,d+.6,gy-5,gy,matStone);
 const H=3,T=.3,y0=gy,y1=gy+H;
 // front wall (local +z) with door gap, back wall (-z) with window gap
 const dz=d/2-T/2, dw=1.8;
 part(-(w/2+dw/2)/2-.0,dz,w/2-dw/2,T,y0,y1,matWood);part((w/2+dw/2)/2,dz,w/2-dw/2,T,y0,y1,matWood);part(0,dz,dw,T,y0+2.3,y1,matWood);
 part(-(w/2+2.4/2)/2,-dz,w/2-1.2,T,y0,y1,matWood);part((w/2+1.2)/2,-dz,w/2-1.2,T,y0,y1,matWood);
 part(0,-dz,2.4,T,y0,y0+1,matWood);part(0,-dz,2.4,T,y0+2.2,y1,matWood);
 // side walls
 part(-w/2+T/2,0,T,d-2*T,y0,y1,matWood);part(w/2-T/2,0,T,d-2*T,y0,y1,matWood);
 // roof slab (walkable) + gable
 part(0,0,w+.8,d+.8,y1,y1+.3,matRoof);
 {const [x,z]=Lf(0,0);const len=(swap?d:w)+.8,rad=(swap?w:d)/2+.6;
  const g=new THREE.CylinderGeometry(rad*.62,rad*.62,len,3);g.rotateX(-Math.PI/2);if(!swap)g.rotateY(Math.PI/2);
  const m=new THREE.Mesh(g,matRoof);m.position.set(x,y1+.3+rad*.31,z);m.castShadow=true;buildGroup.add(m)}
 // simple prop: table + crates inside
 const [tx,tz]=Lf(-w/2+1.4,-d/2+1.5);
 part(-w/2+1.4,-d/2+1.5,1.4,.9,y0,y0+.9,matDark);
 part(w/2-1.1,-d/2+1.1,1,1,y0,y0+1,matWood);
 // chest
 const [chx,chz]=Lf(w/2-1.2,d/2-1.5);
 addChest(chx,gy,chz);
 return {x:cx,z:cz,y:gy,Lf,w,d};
}
function addChest(x,y,z){
 const g=new THREE.Group();g.position.set(x,y,z);
 const body=mkBox(1,.55,.65,new THREE.MeshStandardMaterial({color:0xb98a1c,metalness:.6,roughness:.35,emissive:0x5a3c00,emissiveIntensity:.6}),0,.28,0,g);
 const lid=mkBox(1.02,.2,.67,new THREE.MeshStandardMaterial({color:0xd9a826,metalness:.7,roughness:.3,emissive:0x6a4800,emissiveIntensity:.6}),0,.65,0,g);
 const glow=new THREE.Mesh(new THREE.CylinderGeometry(.35,.55,3,12,1,true),new THREE.MeshBasicMaterial({color:0xffcc44,transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide}));glow.position.y=1.7;g.add(glow);
 scene.add(g);chests.push({x,y,z,g,lid,glow,opened:false});
}
// POIs and cabins
const POI_DEF=[['Pine Hollow',0,-150],['Mirror Lake',150,20],['Old Quarry',-135,-40],['Harbor Rest',20,150],['Fern Valley',-70,95],['Summit Lodge',20,-20],['Eastwatch',120,-110]];
const cabins=[];
for(const[name,px,pz]of POI_DEF){const[x,z]=findLand(px,pz);POIS.push({name,x,z});
 const n=name==='Summit Lodge'?4:5+Math.floor(wr()*2);
 for(let i=0;i<n;i++){const a=i/n*6.28+wr()*.5,r=wrand(14,26);
  const bx=Math.round((x+Math.cos(a)*r)/2)*2,bz=Math.round((z+Math.sin(a)*r)/2)*2;
  const h=terrainH(bx,bz);if(h<2.5||h>18)continue;
  const rot=Math.abs(Math.cos(a))>Math.abs(Math.sin(a))?(Math.cos(a)>0?1:3):(Math.sin(a)>0?2:0);
  // rot so that door (+z local) faces center roughly
  cabins.push(addCabin(bx,bz,Math.floor(wr()*4),wr()<.5?8:10,8))}}

// ---------- trees, rocks, grass, flowers
const trees=[];// circle colliders with instance refs
function instSet(count,parts){const sets=parts.map(p=>{const m=new THREE.InstancedMesh(p.geo,p.mat,count);m.castShadow=true;m.frustumCulled=false;scene.add(m);return m});return sets}
function landSpot(minH=1.6,maxH=24){for(let i=0;i<40;i++){const a=wr()*6.28,r=Math.sqrt(wr())*(R-15),x=Math.cos(a)*r,z=Math.sin(a)*r,h=terrainH(x,z);
  if(h>minH&&h<maxH)return[x,z,h]}return null}
const nearCabin=(x,z,r)=>cabins.some(c=>Math.hypot(c.x-x,c.z-z)<r);
{
 const NC=1100,ND=500;
 const trunkGeo=new THREE.CylinderGeometry(.18,.32,1,7).translate(0,.5,0);
 const barkMat=new THREE.MeshStandardMaterial({map:barkTex,roughness:1});
 const pineMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.9,flatShading:true});
 const pine=instSet(NC,[{geo:trunkGeo,mat:barkMat},{geo:new THREE.ConeGeometry(2.2,3.6,8).translate(0,2.6,0),mat:pineMat},{geo:new THREE.ConeGeometry(1.7,3.2,8).translate(0,4.6,0),mat:pineMat},{geo:new THREE.ConeGeometry(1.15,2.8,8).translate(0,6.5,0),mat:pineMat}]);
 const oakMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.9,flatShading:true});
 const oak=instSet(ND,[{geo:trunkGeo,mat:barkMat},{geo:new THREE.IcosahedronGeometry(2.4,1).translate(0,4.6,0),mat:oakMat},{geo:new THREE.IcosahedronGeometry(1.7,1).translate(1.3,3.7,.6),mat:oakMat}]);
 const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),sc=new THREE.Vector3(),ps=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
 const col=new THREE.Color();
 function plant(sets,idx,kind,count,trunkH){
  for(let i=0;i<count;i++){let sp,tries=0;do{sp=landSpot(1.8,22);tries++}while(sp&&(nearCabin(sp[0],sp[1],11))&&tries<10);if(!sp)continue;
   const [x,z,h]=sp;const s=wrand(.8,1.5);q.setFromAxisAngle(up,wr()*6.28);ps.set(x,h-.2,z);
   sc.set(s,s*(kind==='p'?1:1)*1.0,s);
   // trunk scaled in Y by trunkH
   m4.compose(ps,q,new THREE.Vector3(s,s*trunkH,s));sets[0].setMatrixAt(i,m4);
   m4.compose(ps,q,sc);for(let k=1;k<sets.length;k++)sets[k].setMatrixAt(i,m4);
   if(kind==='o'){col.setHSL(wrand(.2,.28),.5,wrand(.32,.44));for(let k=1;k<sets.length;k++)sets[k].setColorAt(i,col)}
   else{col.setHSL(wrand(.3,.38),.42,wrand(.24,.34));for(let k=1;k<sets.length;k++)sets[k].setColorAt(i,col)}
   const rec={x,z,y:h,r:.55*s,h:8*s,hp:4,kind:'tree',sets,idx,dead:false};trees.push(rec);gAdd(rgrid,rec,x-1,x+1,z-1,z+1)}
  sets.forEach(m=>{m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true});
 }
 plant(pine,0,'p',NC,5);plant(oak,0,'o',ND,3.5);
 // rocks
 const rockMat=new THREE.MeshStandardMaterial({map:stoneTex,color:0xbfbab0,roughness:1,flatShading:true});
 const NR=260,rocks=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,1),rockMat,NR);rocks.castShadow=rocks.receiveShadow=true;rocks.frustumCulled=false;scene.add(rocks);
 for(let i=0;i<NR;i++){const sp=landSpot(-.5,30);if(!sp){continue}const [x,z,h]=sp;const s=wrand(.8,3.2);
  q.setFromEuler(new THREE.Euler(wr()*3,wr()*6,wr()*3));ps.set(x,h+s*.25,z);m4.compose(ps,q,new THREE.Vector3(s*1.2,s*.8,s));rocks.setMatrixAt(i,m4);
  const g=wrand(.5,.9);col.setRGB(g,g*.98,g*.93);rocks.setColorAt(i,col);
  const rec={x,z,y:h,r:s*.9,h:s*1.5,hp:6,kind:'rock',sets:[rocks],idx:i,dead:false};trees.push(rec);gAdd(rgrid,rec,x-s,x+s,z-s,z+s)}
 rocks.instanceMatrix.needsUpdate=true;rocks.instanceColor&&(rocks.instanceColor.needsUpdate=true);
 // grass clumps
 const gg=[];const blade=(x,z,hgt,lean)=>{const w=.045;gg.push(x-w,0,z,x+w,0,z,x+lean,hgt,z+lean*.5)};
 for(let i=0;i<9;i++){const a=i/9*6.28,r=rand(.05,.4);const x=Math.cos(a)*r,z=Math.sin(a)*r;const h=rand(.35,.8);
  const bx=Math.cos(a+1.5)*.05,bz=Math.sin(a+1.5)*.05;gg.push(x-bx,0,z-bz,x+bx,0,z+bz,x+Math.cos(a)*.12,h,z+Math.sin(a)*.12)}
 const grassGeo=new THREE.BufferGeometry();grassGeo.setAttribute('position',new THREE.Float32BufferAttribute(gg,3));grassGeo.computeVertexNormals();
 const NG=11000,grass=new THREE.InstancedMesh(grassGeo,new THREE.MeshLambertMaterial({color:0x6c9a3a,side:THREE.DoubleSide}),NG);grass.frustumCulled=false;scene.add(grass);
 let gi=0;for(let i=0;i<NG*2&&gi<NG;i++){const sp=landSpot(1.6,19);if(!sp)continue;const[x,z,h]=sp;if(nearCabin(x,z,6))continue;
  const s=wrand(.8,1.9);q.setFromAxisAngle(up,wr()*6.28);ps.set(x,h-.02,z);m4.compose(ps,q,new THREE.Vector3(s,s,s));grass.setMatrixAt(gi,m4);
  col.setHSL(wrand(.2,.3),wrand(.4,.6),wrand(.28,.5));grass.setColorAt(gi,col);gi++}
 grass.count=gi;grass.instanceMatrix.needsUpdate=true;grass.instanceColor.needsUpdate=true;
 // flowers
 const NF=1600,fl=new THREE.InstancedMesh(new THREE.SphereGeometry(.09,5,4).translate(0,.35,0),new THREE.MeshLambertMaterial(),NF);scene.add(fl);fl.frustumCulled=false;
 const fc=[0xffffff,0xffe14a,0xc283ff,0xff7fa8,0x7fb8ff];let fi=0;
 for(let i=0;i<NF*2&&fi<NF;i++){const sp=landSpot(1.8,16);if(!sp)continue;const[x,z,h]=sp;m4.makeTranslation(x,h,z);fl.setMatrixAt(fi,m4);col.setHex(fc[Math.floor(wr()*5)]);fl.setColorAt(fi,col);fi++}
 fl.count=fi;fl.instanceMatrix.needsUpdate=true;fl.instanceColor.needsUpdate=true;
}
function fellTree(rec){rec.dead=true;const z=new THREE.Matrix4().makeScale(0,0,0);rec.sets.forEach(m=>{m.setMatrixAt(rec.idx,z);m.instanceMatrix.needsUpdate=true})}

// ---------- audio
let AC=null;
function audio(){if(!AC)try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}return AC}
function sfx(kind,vol=1,dist=0){const a=audio();if(!a)return;const g0=vol*Math.max(0,1-dist/120);if(g0<=.01)return;
 const t=a.currentTime,g=a.createGain();g.connect(a.destination);
 if(kind==='shot'||kind==='boom'||kind==='thud'){const len=kind==='boom'?.7:kind==='thud'?.08:.16;
  const b=a.createBuffer(1,a.sampleRate*len,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,kind==='boom'?1.5:3);
  const s=a.createBufferSource();s.buffer=b;const f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=kind==='thud'?500:kind==='boom'?400:2200;s.connect(f);f.connect(g);g.gain.value=.35*g0;s.start(t)}
 else{const o=a.createOscillator();o.type='triangle';o.frequency.value=kind==='pick'?660:kind==='hit'?900:440;o.connect(g);g.gain.setValueAtTime(.15*g0,t);g.gain.exponentialRampToValueAtTime(.001,t+.15);o.start(t);o.stop(t+.16)}}

// ---------- weapons / items
const RAR=[{n:'Common',c:'#b8b8b8',m:1},{n:'Uncommon',c:'#5ed36a',m:1.1},{n:'Rare',c:'#4aa8ff',m:1.2},{n:'Epic',c:'#c46bff',m:1.3},{n:'Legendary',c:'#ffa522',m:1.45}];
const WDEF={
 viper:{name:'Viper Pistol',dmg:23,rate:.3,mag:12,rel:1.4,spr:1.4,pel:1,range:130,auto:false,ammo:'light',kick:.012},
 hornet:{name:'Hornet SMG',dmg:16,rate:.085,mag:30,rel:1.9,spr:3.4,pel:1,range:110,auto:true,ammo:'light',kick:.008},
 ranger:{name:'Ranger AR',dmg:30,rate:.13,mag:30,rel:2.3,spr:2,pel:1,range:220,auto:true,ammo:'medium',kick:.011},
 thunder:{name:'Thunderclap',dmg:11,rate:.85,mag:6,rel:3,spr:6.5,pel:9,range:42,auto:false,ammo:'shell',kick:.04},
 longshot:{name:'Longshot',dmg:105,rate:1.5,mag:5,rel:3,spr:.08,pel:1,range:420,auto:false,ammo:'heavy',kick:.05,scope:true}};
const WKEYS=Object.keys(WDEF);
function rollRarity(){const r=Math.random();return r<.38?0:r<.65?1:r<.85?2:r<.96?3:4}
function newWeapon(k,rar){const d=WDEF[k];return{key:k,def:d,rar,mag:d.mag,dmg:d.dmg*RAR[rar].m}}
function makeGunMesh(k,scale=1){const g=new THREE.Group(),dk=new THREE.MeshStandardMaterial({color:0x222426,metalness:.7,roughness:.4}),wd=new THREE.MeshStandardMaterial({color:0x5a3d22,roughness:.8});
 const b=(w,h,d,x,y,z,m)=>{const e=new THREE.Mesh(boxGeo,m||dk);e.scale.set(w,h,d);e.position.set(x,y,z);e.castShadow=true;g.add(e)};
 if(k==='viper'){b(.05,.08,.2,0,0,0);b(.04,.04,.16,0,.05,-.02);b(.04,.1,.05,0,-.08,.06)}
 else if(k==='hornet'){b(.06,.09,.35,0,0,0);b(.04,.14,.05,0,-.1,0);b(.035,.035,.12,0,.01,-.22);b(.04,.05,.12,0,0,.2,wd)}
 else if(k==='ranger'){b(.06,.1,.5,0,0,0);b(.04,.04,.4,0,.02,-.42);b(.045,.16,.07,0,-.1,.02);b(.05,.08,.22,0,-.01,.34,wd);b(.03,.04,.14,0,.08,-.05)}
 else if(k==='thunder'){b(.06,.08,.6,0,0,0);b(.05,.05,.5,0,.0,-.5);b(.07,.09,.28,0,-.02,.4,wd);b(.07,.05,.2,0,-.06,-.25,wd)}
 else{b(.05,.09,.55,0,0,0);b(.035,.035,.65,0,.02,-.6);b(.05,.1,.3,0,-.02,.42,wd);b(.04,.05,.2,0,.09,-.05)}
 g.scale.setScalar(scale);return g}
const itemGroup=new THREE.Group();scene.add(itemGroup);
function spawnItem(x,y,z,type,data){
 const col=type==='weapon'?RAR[data.rar].c:type==='ammo'?'#e8d07a':type==='medkit'?'#ff6b6b':'#4aa8ff';
 const g=new THREE.Group();g.position.set(x,y+.5,z);
 let body;
 if(type==='weapon')body=makeGunMesh(data.key,2.0);
 else{body=new THREE.Mesh(type==='ammo'?boxGeo:type==='medkit'?boxGeo:new THREE.CylinderGeometry(.14,.18,.4,10),new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:.4,roughness:.5}));
  if(type!=='shield')body.scale.set(.4,.28,.3);}
 g.add(body);
 const beam=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,6,10,1,true),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.2,depthWrite:false,side:THREE.DoubleSide}));beam.position.y=2.6;g.add(beam);
 itemGroup.add(g);const it={x,y,z,type,data,g,body,t:Math.random()*6};items.push(it);return it}
function itemName(it){return it.type==='weapon'?`${it.data.def.name} (${RAR[it.data.rar].n})`:it.type==='ammo'?'Ammo box':it.type==='medkit'?'Bandages':'Shield potion'}
function removeItem(it){const i=items.indexOf(it);if(i>=0)items.splice(i,1);itemGroup.remove(it.g)}
function randomLoot(x,y,z){const r=Math.random();
 if(r<.5)return spawnItem(x,y,z,'weapon',newWeapon(pick(WKEYS),rollRarity()));
 if(r<.7)return spawnItem(x,y,z,'ammo',{});
 if(r<.85)return spawnItem(x,y,z,'shield',{});return spawnItem(x,y,z,'medkit',{})}
// scatter loot
for(const c of cabins){const[x,z]=[c.x,c.z];for(let i=0;i<2;i++){const lx=wrand(-c.w/2+1.5,c.w/2-1.5),lz=wrand(-3,3);const[ix,iz]=c.Lf(lx,lz);randomLoot(ix,c.y+.2,iz)}}
for(let i=0;i<70;i++){const sp=landSpot(2,20);if(sp)randomLoot(sp[0],sp[2],sp[1])}

// ---------- characters
const SKINS=[
 {name:'Ranger',shirt:0x55603a,pants:0x3d4430,vest:0x2b3322,hat:'cap',hatC:0x3a4528,skin:0xd8a77c},
 {name:'Ghillie',shirt:0x4a5a2a,pants:0x4a5a2a,vest:0x3a4a20,hat:'hood',hatC:0x44562a,skin:0xc89870,ghillie:true},
 {name:'Arctic',shirt:0xe9eef0,pants:0xcfd8dc,vest:0x9fb2bb,hat:'beanie',hatC:0xdde6ea,skin:0xe6bd9b},
 {name:'Desert',shirt:0xb89a68,pants:0x9c8156,vest:0x6e5a3a,hat:'helmet',hatC:0x8a7348,skin:0x9a6b45},
 {name:'Hiker',shirt:0xc2402e,pants:0x2f3b4f,vest:0x1f6e8c,hat:'beanie',hatC:0xf0b429,skin:0xf0c9a5},
 {name:'Shadow',shirt:0x1d1f24,pants:0x16181c,vest:0x2a2d34,hat:'helmet',hatC:0x101114,skin:0x6b4a35}];
const lam=c=>new THREE.MeshStandardMaterial({color:c,roughness:.85});
function makeChar(sk,name){
 const g=new THREE.Group(),P={};
 const cap=(r,l,m)=>{const e=new THREE.Mesh(new THREE.CapsuleGeometry(r,l,4,8),m);e.castShadow=true;return e};
 const shirt=lam(sk.shirt),pants=lam(sk.pants),skin=lam(sk.skin),vest=lam(sk.vest);
 // legs (pivot at hip)
 for(const s of[-1,1]){const p=new THREE.Group();p.position.set(s*.11,.92,0);const l=cap(.085,.62,pants);l.position.y=-.44;p.add(l);
  const boot=new THREE.Mesh(boxGeo,lam(0x1a1a1a));boot.scale.set(.16,.12,.28);boot.position.set(0,-.88,.04);boot.castShadow=true;p.add(boot);g.add(p);P[s<0?'legL':'legR']=p}
 // torso
 const tor=new THREE.Mesh(new THREE.CapsuleGeometry(.2,.32,4,10),shirt);tor.scale.set(1,1,.62);tor.position.y=1.22;tor.castShadow=true;g.add(tor);
 const vs=new THREE.Mesh(boxGeo,vest);vs.scale.set(.46,.4,.3);vs.position.set(0,1.25,.01);vs.castShadow=true;g.add(vs);
 const pack=new THREE.Mesh(boxGeo,vest);pack.scale.set(.34,.42,.18);pack.position.set(0,1.25,.22);pack.castShadow=true;g.add(pack);
 // head
 const head=new THREE.Mesh(new THREE.SphereGeometry(.115,16,12),skin);head.scale.set(.95,1.1,1);head.position.y=1.66;head.castShadow=true;g.add(head);P.head=head;
 const neck=cap(.05,.06,skin);neck.position.y=1.55;g.add(neck);
 const gog=new THREE.Mesh(boxGeo,lam(0x101010));gog.scale.set(.2,.05,.06);gog.position.set(0,1.675,-.1);g.add(gog);
 const hm=lam(sk.hatC);
 if(sk.hat==='helmet'){const h=new THREE.Mesh(new THREE.SphereGeometry(.135,14,10,0,6.28,0,1.7),hm);h.position.y=1.68;h.castShadow=true;g.add(h)}
 else if(sk.hat==='cap'){const h=new THREE.Mesh(new THREE.SphereGeometry(.125,14,10,0,6.28,0,1.5),hm);h.position.y=1.69;g.add(h);const br=new THREE.Mesh(boxGeo,hm);br.scale.set(.2,.015,.12);br.position.set(0,1.7,-.14);g.add(br)}
 else if(sk.hat==='beanie'){const h=new THREE.Mesh(new THREE.SphereGeometry(.125,14,10,0,6.28,0,1.6),hm);h.position.y=1.69;g.add(h);const pm=new THREE.Mesh(new THREE.SphereGeometry(.035,8,6),hm);pm.position.y=1.82;g.add(pm)}
 else if(sk.hat==='hood'){const h=new THREE.Mesh(new THREE.SphereGeometry(.15,14,10,0,6.28,0,2.1),hm);h.position.set(0,1.665,.015);g.add(h)}
 // arms: pivot at shoulder, raised to hold a weapon
 for(const s of[-1,1]){const p=new THREE.Group();p.position.set(s*.27,1.45,0);
  const a=cap(.055,.5,shirt);a.position.y=-.3;p.add(a);const hand=new THREE.Mesh(new THREE.SphereGeometry(.05,8,6),skin);hand.position.y=-.62;p.add(hand);g.add(p);P[s<0?'armL':'armR']=p}
 if(sk.ghillie){const lm2=new THREE.MeshStandardMaterial({color:0x4d6a2a,roughness:1,flatShading:true});
  for(let i=0;i<46;i++){const m=new THREE.Mesh(new THREE.IcosahedronGeometry(rand(.05,.1),0),i%3?lm2:lam(0x6b5a30));
   m.position.set(rand(-.28,.28),rand(.5,1.75),rand(-.18,.22));m.scale.y=1.6;m.rotation.set(rand(0,3),rand(0,3),0);g.add(m)}}
 const gunSlot=new THREE.Group();gunSlot.position.set(.0,-.55,-.05);P.armR.add(gunSlot);P.gunSlot=gunSlot;
 // name tag
 if(name){const c=document.createElement('canvas');c.width=256;c.height=48;const x=c.getContext('2d');x.font='bold 28px Segoe UI,Arial';x.textAlign='center';x.fillStyle='rgba(0,0,0,.45)';x.fillRect(0,0,256,48);x.fillStyle='#fff';x.fillText(name,128,34);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthTest:false,transparent:true}));sp.scale.set(1.3,.24,1);sp.position.y=2.15;sp.renderOrder=5;g.add(sp);P.tag=sp}
 g.userData.P=P;return g}
function setGun(model,k){const P=model.userData.P;while(P.gunSlot.children.length)P.gunSlot.remove(P.gunSlot.children[0]);P.armed=!!k;
 if(k){const gm=makeGunMesh(k,1.1);gm.rotation.x=Math.PI/2*0;P.gunSlot.add(gm)}}
function pickaxeMesh(){const g=new THREE.Group();const h=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.75,6),lam(0x6b4a2a));h.rotation.x=Math.PI/2;g.add(h);
 const head=new THREE.Mesh(boxGeo,new THREE.MeshStandardMaterial({color:0x9aa3aa,metalness:.8,roughness:.3}));head.scale.set(.5,.05,.06);head.position.z=-.36;g.add(head);return g}
function animChar(model,speed,t,state,aim,swing){const P=model.userData.P,a=speed>.5?Math.sin(t*Math.min(speed,10)*1.1)*Math.min(.9,speed*.12):0;
 if(state==='fall'){model.rotation.x=1.35;P.legL.rotation.x=.25;P.legR.rotation.x=-.2;P.armL.rotation.set(0,0,-1.3);P.armR.rotation.set(0,0,1.3);return}
 if(state==='glide'){model.rotation.x=0;P.legL.rotation.x=.3;P.legR.rotation.x=-.1;P.armL.rotation.set(0,0,2.6);P.armR.rotation.set(0,0,-2.6);return}
 model.rotation.x=0;P.legL.rotation.x=a;P.legR.rotation.x=-a;
 if(P.armed){P.armR.rotation.set(-1.45,0,-.12);P.armL.rotation.set(-1.25,0,.55)}
 else{P.armR.rotation.set(-.5+(swing>0?-Math.sin(swing*Math.PI)*1.6:0),0,-.1);P.armL.rotation.set(-a*.7,0,.05)}
 if(!P.armed&&a!==0&&!(swing>0))P.armR.rotation.x=a*.7}
function makeGlider(color){const g=new THREE.Group();
 const c=new THREE.Mesh(new THREE.SphereGeometry(2.6,20,8,0,6.28,0,1.2),new THREE.MeshStandardMaterial({color,roughness:.7,side:THREE.DoubleSide}));c.scale.set(1.3,.7,1.1);c.position.y=2.3;g.add(c);
 const lm=new THREE.LineBasicMaterial({color:0xdddddd});for(let i=0;i<6;i++){const a=i/6*6.28,p=[new THREE.Vector3(Math.cos(a)*3,2.3,Math.sin(a)*2.5),new THREE.Vector3(0,1.6,0)];g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(p),lm))}
 return g}

// ---------- tracers + sparks
const tracers=[];
function tracer(a,b,color=0xfff2b0){const g=new THREE.BufferGeometry().setFromPoints([a,b]);const l=new THREE.Line(g,new THREE.LineBasicMaterial({color,transparent:true,opacity:.9}));scene.add(l);tracers.push({l,t:.07})}
const sparks=[];const sparkGeo=new THREE.SphereGeometry(.05,4,3);
function puff(p,color=0xdddddd,n=5,spd=3){for(let i=0;i<n;i++){const m=new THREE.Mesh(sparkGeo,new THREE.MeshBasicMaterial({color,transparent:true}));m.position.copy(p);scene.add(m);
 sparks.push({m,v:new THREE.Vector3(rand(-1,1),rand(.2,1.2),rand(-1,1)).multiplyScalar(spd),t:.45})}}
function updateFx(dt){for(let i=tracers.length-1;i>=0;i--){const t=tracers[i];t.t-=dt;if(t.t<=0){scene.remove(t.l);t.l.geometry.dispose();tracers.splice(i,1)}}
 for(let i=sparks.length-1;i>=0;i--){const s=sparks[i];s.t-=dt;s.v.y-=9*dt;s.m.position.addScaledVector(s.v,dt);s.m.material.opacity=Math.max(0,s.t*2.2);if(s.t<=0){scene.remove(s.m);s.m.material.dispose();sparks.splice(i,1)}}}

// ---------- game state
const chars=[];const vehicles=[];
const G={started:false,over:false,t:0,busT:0,paused:false};
const kfeed=$('feed');
function feed(txt){const d=document.createElement('div');d.textContent=txt;kfeed.appendChild(d);setTimeout(()=>d.remove(),6000);while(kfeed.children.length>5)kfeed.firstChild.remove()}
function banner(t,ms=2500){const b=$('banner');b.textContent=t;b.style.opacity=1;clearTimeout(banner.h);banner.h=setTimeout(()=>b.style.opacity=0,ms)}

// ---------- vehicles
function makeCar(kind){const g=new THREE.Group();const specs={
  jeep:{col:0x5b6b3a,w:1.9,l:3.9,h:.8,cab:[1.7,.75,1.9,-.2]},sport:{col:0xc22b25,w:1.9,l:4.3,h:.6,cab:[1.5,.55,1.8,.0]},pickup:{col:0x2e5d8a,w:2,l:4.7,h:.85,cab:[1.8,.8,1.6,-.7]}}[kind];
 const paint=new THREE.MeshStandardMaterial({color:specs.col,metalness:.55,roughness:.35}),glass=new THREE.MeshStandardMaterial({color:0x223340,metalness:.9,roughness:.1}),blk=lam(0x151515);
 const b=(w,h,d,x,y,z,m)=>{const e=new THREE.Mesh(boxGeo,m);e.scale.set(w,h,d);e.position.set(x,y,z);e.castShadow=true;g.add(e);return e};
 b(specs.w,specs.h,specs.l,0,.62+specs.h/2,0,paint);
 b(specs.cab[0],specs.cab[1],specs.cab[2],0,.62+specs.h+specs.cab[1]/2,specs.cab[3],glass);
 b(specs.cab[0]+.04,.08,specs.cab[2]+.04,0,.62+specs.h+specs.cab[1],specs.cab[3],paint);
 b(specs.w+.1,.2,.3,0,.72,-specs.l/2,blk);b(specs.w+.1,.2,.3,0,.72,specs.l/2,blk);
 for(const s of[-.7,.7])b(.3,.15,.05,s,.95,-specs.l/2-.01,new THREE.MeshBasicMaterial({color:0xfff6c0}));
 const wheels=[];for(const[x,z]of[[-1,-1],[1,-1],[-1,1],[1,1]]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.3,16),blk);w.rotation.z=Math.PI/2;w.position.set(x*(specs.w/2),.42,z*(specs.l/2-.8));w.castShadow=true;g.add(w);wheels.push(w)}
 return{g,wheels,len:specs.l,wid:specs.w}}
function spawnCar(x,z,heading,kind){const m=makeCar(kind);scene.add(m.g);const v={...m,x,z,y:terrainH(x,z),heading,speed:0,hp:400,driver:null,pitch:0,roll:0,dead:false,kind};vehicles.push(v);updCarMesh(v);return v}
function updCarMesh(v){v.g.position.set(v.x,v.y,v.z);v.g.rotation.set(0,0,0);v.g.rotation.order='YXZ';v.g.rotation.y=v.heading;v.g.rotation.x=v.pitch;v.g.rotation.z=v.roll}
// cars near POIs + a few roadside
for(const p of POIS){for(let i=0;i<2;i++){const a=wrand(0,6.28),r=wrand(30,42);const x=p.x+Math.cos(a)*r,z=p.z+Math.sin(a)*r;if(terrainH(x,z)>2.2)spawnCar(x,z,wr()*6.28,pick(['jeep','sport','pickup']))}}
for(let i=0;i<5;i++){const sp=landSpot(2.2,10);if(sp)spawnCar(sp[0],sp[1],wr()*6.28,pick(['jeep','sport','pickup']))}
function explodeCar(v){v.dead=true;v.speed=0;sfx('boom',1.4,distTo(v.x,v.z));puff(new THREE.Vector3(v.x,v.y+1,v.z),0xff8a2a,30,8);puff(new THREE.Vector3(v.x,v.y+1,v.z),0x333333,20,4);
 v.g.traverse(o=>{if(o.material&&o.material.color)o.material=new THREE.MeshStandardMaterial({color:0x1a1a1a,roughness:1})});
 for(const c of chars)if(c.alive&&Math.hypot(c.pos.x-v.x,c.pos.z-v.z)<7)damage(c,70,v.lastDriver||null,'Explosion');
 if(v.driver)exitCar(v.driver,true)}

// ---------- ray casting (environment marched, characters analytic)
function distTo(x,z){const p=chars[0];return p?Math.hypot(p.pos.x-x,p.pos.z-z):0}
function raycastEnv(o,d,range,step=.5){const p=new THREE.Vector3();
 for(let t=.3;t<=range;t+=step){p.set(o.x+d.x*t,o.y+d.y*t,o.z+d.z*t);
  const th=terrainH(p.x,p.z);if(p.y<th)return{t,type:'ground',p:p.clone()};
  if(p.y<WATER-.2&&false)return null;
  for(const c of gGet(cgrid,p.x,p.z,0)){if(p.x<c.x0||p.x>c.x1||p.z<c.z0||p.z>c.z1)continue;if(p.y>c.y0&&p.y<topOf(c,p.x,p.z))return{t,type:'build',p:p.clone(),c}}
  for(const r of gGet(rgrid,p.x,p.z,0)){if(p.y>r.y&&p.y<r.y+r.h&&Math.hypot(p.x-r.x,p.z-r.z)<r.r)return{t,type:'prop',p:p.clone()}}}
 return null}
function raycast(o,d,range,ignore){const env=raycastEnv(o,d,range);let best=env?env.t:range,res=env||{t:range,type:'none',p:new THREE.Vector3(o.x+d.x*range,o.y+d.y*range,o.z+d.z*range)};
 const tmp=new THREE.Vector3();
 for(const c of chars){if(!c.alive||c===ignore||c.state==='bus'||c.state==='car')continue;
  const cx=c.pos.x,cy=c.pos.y+(c.state==='fall'||c.state==='glide'?.9:.9),cz=c.pos.z;
  const tx=cx-o.x,ty=cy-o.y,tz=cz-o.z,t=tx*d.x+ty*d.y+tz*d.z;if(t<0||t>best)continue;
  const px=o.x+d.x*t,py=o.y+d.y*t,pz=o.z+d.z*t;
  if(Math.hypot(px-cx,pz-cz)<.4&&py>c.pos.y&&py<c.pos.y+1.85){best=t;res={t,type:'char',c,p:new THREE.Vector3(px,py,pz),head:py>c.pos.y+1.5}}}
 for(const v of vehicles){if(v.dead||v.driver===ignore)continue;const cx=v.x,cy=v.y+1,cz=v.z,t=(cx-o.x)*d.x+(cy-o.y)*d.y+(cz-o.z)*d.z;if(t<0||t>best)continue;
  const px=o.x+d.x*t,py=o.y+d.y*t,pz=o.z+d.z*t;if(Math.hypot(px-cx,py-cy,pz-cz)<1.6){best=t;res={t,type:'car',v,p:new THREE.Vector3(px,py,pz)}}}
 return res}

// ---------- damage
let aliveCount=30;
function damage(c,amt,by,wname,head){if(!c.alive||G.over&&c.isPlayer)return;
 const sh=Math.min(c.shield,amt);c.shield-=sh;c.hp-=amt-sh;
 if(c.isPlayer){$('dmgVig').classList.add('hit');setTimeout(()=>$('dmgVig').classList.remove('hit'),120)}
 if(c.hp<=0)kill(c,by,wname)}
function kill(c,by,wname){if(!c.alive)return;c.alive=false;c.hp=0;aliveCount--;
 const kn=by?by.name:'The Storm';if(by&&by!==c){by.kills++;if(by.isPlayer)$('kills').textContent=by.kills}
 feed(`${kn}  ✕  ${c.name}  ${wname?'['+wname+']':''}`);
 // drop loot
 if(c.wep)spawnItem(c.pos.x,groundAt(c.pos.x,c.pos.z,c.pos.y),c.pos.z,'weapon',newWeapon(c.wep.key,c.wep.rar));
 if(Math.random()<.7)spawnItem(c.pos.x+1,groundAt(c.pos.x+1,c.pos.z,c.pos.y),c.pos.z,Math.random()<.5?'shield':'medkit',{});
 c.deadT=0;if(c.glider){c.model.remove(c.glider);c.glider=null}
 c.model.rotation.set(-Math.PI/2,0,0);c.model.position.y=c.pos.y+.15;if(c.model.userData.P.tag)c.model.userData.P.tag.visible=false;
 $('alive').textContent=aliveCount;
 if(c.isPlayer)endGame(false,by);
 else if(aliveCount<=1&&chars[0].alive)endGame(true)}
function endGame(win,by){if(G.over)return;G.over=true;document.exitPointerLock&&document.exitPointerLock();
 $('endTitle').textContent=win?'VICTORY! 🏆':'ELIMINATED';
 $('endTitle').style.color=win?'#7dff9b':'#ff6b6b';
 $('endSub').textContent=win?`Last one standing with ${chars[0].kills} elimination(s).`:`You placed #${aliveCount+1} · ${chars[0].kills} elimination(s)${by?' · eliminated by '+by.name:''}`;
 setTimeout(()=>$('end').classList.remove('hidden'),win?600:1800)}

// ---------- input
const keys={};let mdown=false,rdown=false,camYaw=0,camPitch=-.2,locked=false;
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;keys[e.code]=true;if(e.code==='Space'||e.code.startsWith('Arrow'))e.preventDefault();keyPress(e.code)});
addEventListener('keyup',e=>{keys[e.code]=false});
addEventListener('mousedown',e=>{if(!locked)return;if(e.button===0)mdown=true;if(e.button===2)rdown=true;audio()});
addEventListener('mouseup',e=>{if(e.button===0)mdown=false;if(e.button===2)rdown=false});
addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('mousemove',e=>{if(!locked)return;camYaw-=e.movementX*.0022*(rdown?.6:1);camPitch=clamp(camPitch-e.movementY*.0022*(rdown?.6:1),-1.35,1.25)});
addEventListener('wheel',e=>{if(!locked||!P||!P.alive||P.state!=='ground')return;selectSlot((P.cur+(e.deltaY>0?1:4))%5)});
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===canvas;
 if(G.started&&!G.over)$('pause').classList.toggle('hidden',locked);mdown=rdown=false});
$('pause').addEventListener('click',()=>canvas.requestPointerLock());

// ---------- player
const P={isPlayer:true,name:'You',pos:new THREE.Vector3(),vy:0,hv:new THREE.Vector3(),yaw:0,hp:100,shield:0,alive:true,kills:0,state:'bus',
 slots:['pick',null,null,null,null],cur:0,mats:60,ammo:{light:0,medium:0,shell:0,heavy:0},med:0,shd:0,reloadT:0,fireT:0,swing:0,swingHit:false,onGround:false,car:null,
 build:false,piece:1,wep:null,model:null,speed:0,anim:0,glider:null,jumpCool:0};
chars.push(P);
let selSkin=0;
SKINS.forEach((s,i)=>{const d=document.createElement('div');d.className='skin'+(i?'':' sel');
 d.innerHTML=`<div class="sw">${[s.shirt,s.pants,s.vest,s.hatC].map(c=>`<i style="background:#${c.toString(16).padStart(6,'0')}"></i>`).join('')}</div>${s.name}`;
 d.onclick=()=>{selSkin=i;[...$('skins').children].forEach(x=>x.classList.remove('sel'));d.classList.add('sel')};$('skins').appendChild(d)});
const pickaxe=pickaxeMesh();
function curWeapon(){const s=P.slots[P.cur];return s&&s!=='pick'?s:null}
function selectSlot(i){if(i<0||i>4||P.state!=='ground')return;P.cur=i;P.build=false;P.wep=curWeapon();P.reloadT=0;refreshHeld();hudSlots()}
function refreshHeld(){const m=P.model;const Pp=m.userData.P;P.wep=curWeapon();
 while(Pp.gunSlot.children.length)Pp.gunSlot.remove(Pp.gunSlot.children[0]);
 if(P.wep){Pp.armed=true;Pp.gunSlot.add(makeGunMesh(P.wep.key,1.1))}else{Pp.armed=false;Pp.gunSlot.add(pickaxe);pickaxe.position.set(0,0,-.1);pickaxe.rotation.set(0,0,0)}}
function hudSlots(){const el=$('slots');el.innerHTML='';
 for(let i=0;i<5;i++){const s=P.slots[i],d=document.createElement('div');d.className='slot'+(i===P.cur&&!P.build?' act':'');
  let nm='',am='',col='rgba(255,255,255,.2)';
  if(s==='pick'){nm='Pickaxe'}else if(s){nm=s.def.name;col=RAR[s.rar].c;am=`${s.mag} / ${P.ammo[s.def.ammo]}`}
  d.style.borderColor=col;d.innerHTML=`<span class="k">${i+1}</span><span class="nm">${nm}</span><span class="am">${am}</span>`;el.appendChild(d)}
 $('matsN').textContent=P.mats;$('medN').textContent=`🩹 ${P.med} [H]`;$('shdN').textContent=`🧪 ${P.shd} [G]`;$('buildInfo').classList.toggle('hidden',!P.build)}
function giveItem(it){
 if(it.type==='weapon'){let slot=-1;for(let i=1;i<5;i++)if(!P.slots[i]){slot=i;break}
  if(slot<0)slot=P.cur>0?P.cur:4;const old=P.slots[slot];
  if(old&&old!=='pick')spawnItem(P.pos.x+Math.cos(camYaw)*1,groundAt(P.pos.x,P.pos.z,P.pos.y),P.pos.z,'weapon',old);
  P.slots[slot]=it.data;P.cur=slot;P.build=false;P.wep=it.data;refreshHeld()}
 else if(it.type==='ammo'){P.ammo.light+=36;P.ammo.medium+=30;P.ammo.shell+=8;P.ammo.heavy+=5}
 else if(it.type==='medkit')P.med+=3;else P.shd+=1;
 removeItem(it);sfx('pick',.8);hudSlots()}
function useHeal(){if(P.med>0&&P.hp<75){P.med--;P.hp=Math.min(75,P.hp+25);sfx('pick');hudSlots()}}
function useShield(){if(P.shd>0&&P.shield<100){P.shd--;P.shield=Math.min(100,P.shield+50);sfx('pick');hudSlots()}}
function keyPress(c){if(!G.started||G.over||!P.alive)return;
 if(c==='Space'){if(P.state==='bus')leaveBus();else if(P.state==='fall'&&P.fallT>.6)deployGlider()}
 if(P.state!=='ground'&&P.state!=='car')return;
 if(c==='KeyE')interact();
 if(P.state!=='ground')return;
 if(c==='KeyR')startReload();
 if(c==='KeyH')useHeal();if(c==='KeyG')useShield();
 if(c==='KeyQ'){P.build=!P.build;if(P.build){P.piece=1}else refreshHeld();hudSlots()}
 if(P.build){if(c==='Digit1')P.piece=1;if(c==='Digit2')P.piece=2;if(c==='Digit3')P.piece=3}
 else if(c.startsWith('Digit')){selectSlot(parseInt(c.slice(5))-1)}}
function startReload(){const w=P.wep;if(!w||P.reloadT>0||w.mag>=w.def.mag||P.ammo[w.def.ammo]<=0)return;P.reloadT=w.def.rel;banner('Reloading…',w.def.rel*1000)}
// near-interactable detection
let nearTarget=null;
function findInteract(){let best=null,bd=1e9;
 if(P.state==='car'){return{type:'exit',txt:'E — Exit car'}}
 for(const c of chests){if(c.opened)continue;const d=Math.hypot(c.x-P.pos.x,c.z-P.pos.z);if(d<2.8&&Math.abs(c.y-P.pos.y)<2.5&&d<bd){bd=d;best={type:'chest',o:c,txt:'E — Open chest'}}}
 for(const it of items){const d=Math.hypot(it.x-P.pos.x,it.z-P.pos.z);if(d<2.6&&Math.abs(it.y-P.pos.y)<2.5&&d<bd){bd=d;best={type:'item',o:it,txt:'E — Pick up '+itemName(it)}}}
 for(const v of vehicles){if(v.dead||v.driver)continue;const d=Math.hypot(v.x-P.pos.x,v.z-P.pos.z);if(d<4.2&&d<bd){bd=d;best={type:'car',o:v,txt:'E — Drive car'}}}
 return best}
function interact(){const t=nearTarget;if(!t)return;
 if(t.type==='exit')exitCar(P);
 else if(t.type==='car')enterCar(P,t.o);
 else if(t.type==='item')giveItem(t.o);
 else if(t.type==='chest'){const c=t.o;c.opened=true;c.lid.rotation.x=-1.2;c.lid.position.set(0,.8,-.3);c.glow.visible=false;sfx('pick',1);puff(new THREE.Vector3(c.x,c.y+.8,c.z),0xffd25a,14,3);
  for(let i=0;i<3;i++){const a=i/3*6.28+.5;const r=randomLoot(c.x+Math.cos(a)*1.4,c.y+.2,c.z+Math.sin(a)*1.4);if(i===0&&r.type!=='weapon'){removeItem(r);spawnItem(c.x+Math.cos(a)*1.4,c.y+.2,c.z+Math.sin(a)*1.4,'weapon',newWeapon(pick(WKEYS),Math.max(1,rollRarity())))}}}}
function enterCar(c,v){c.state='car';c.car=v;v.driver=c;v.lastDriver=c;c.model.visible=false;if(c.isPlayer){P.build=false;hudSlots();startEngine()}}
function exitCar(c,forced){const v=c.car;if(!v)return;v.driver=null;c.car=null;c.state='ground';c.model.visible=true;
 const rx=Math.cos(v.heading),rz=-Math.sin(v.heading);c.pos.set(v.x-rx*2.4,v.y+.5,v.z-rz*2.4);c.vy=0;v.speed*=.5;if(c.isPlayer){stopEngine();refreshHeld()}}
let engOsc=null,engGain=null;
function startEngine(){const a=audio();if(!a||engOsc)return;engOsc=a.createOscillator();engOsc.type='sawtooth';engGain=a.createGain();engGain.gain.value=.04;const f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=500;engOsc.connect(f);f.connect(engGain);engGain.connect(a.destination);engOsc.start()}
function stopEngine(){if(engOsc){engOsc.stop();engOsc=null}}

// ---------- airship (the "bus")
const bus=new THREE.Group();
{const env=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),new THREE.MeshStandardMaterial({color:0xd9d2c0,roughness:.6}));env.scale.set(8,6,22);bus.add(env);
 for(let i=-2;i<=2;i++){const st=new THREE.Mesh(new THREE.TorusGeometry(1,.06,6,28),new THREE.MeshStandardMaterial({color:0x2f6a4a}));st.rotation.y=Math.PI/2;st.position.z=i*7;const k=Math.sqrt(Math.max(0,1-Math.pow(i*7/22,2)));st.scale.set(6*k,8*k,1);bus.add(st)}
 const gon=new THREE.Mesh(boxGeo,new THREE.MeshStandardMaterial({color:0x6b4a2a,roughness:.8}));gon.scale.set(4,3,10);gon.position.y=-8;bus.add(gon);
 for(const x of[-1.5,1.5])for(const z of[-3,3]){const l=new THREE.Mesh(boxGeo,matDark);l.scale.set(.1,3,.1);l.position.set(x,-5.5,z);bus.add(l)}
 const fin=new THREE.Mesh(boxGeo,new THREE.MeshStandardMaterial({color:0x2f6a4a}));fin.scale.set(.3,6,6);fin.position.set(0,0,-20);bus.add(fin);const fin2=fin.clone();fin2.scale.set(6,.3,6);bus.add(fin2);
 bus.scale.setScalar(.8);scene.add(bus)}
const BUS_START=new THREE.Vector3(-R*.9,230,-R*.45),BUS_END=new THREE.Vector3(R*.9,230,R*.35),BUS_DIR=BUS_END.clone().sub(BUS_START),BUS_LEN=BUS_DIR.length();BUS_DIR.normalize();
const BUS_SPEED=48;bus.rotation.y=Math.atan2(-BUS_DIR.x,-BUS_DIR.z)+Math.PI;
function busPos(t){return BUS_START.clone().addScaledVector(BUS_DIR,Math.min(t*BUS_SPEED,BUS_LEN))}
function leaveBus(){const bp=busPos(G.busT);P.pos.copy(bp);P.pos.y-=8;P.state='fall';P.vy=0;P.fallT=0;P.model.visible=true;P.hv.set(BUS_DIR.x*20,0,BUS_DIR.z*20);banner('Space to open your glider · W to dive forward',3500)}
function deployGlider(){P.state='glide';P.glider=makeGlider(0x3a8a5a);P.model.add(P.glider);P.vy=Math.max(P.vy,-10);banner('')}

// ---------- shooting
function fireWeapon(c,origin,dir,w,aimMul,muzzle){
 const d=w.def;sfx('shot',c.isPlayer?1:.9,c.isPlayer?0:distTo(c.pos.x,c.pos.z));
 for(let i=0;i<d.pel;i++){
  const sp=d.spr*aimMul*Math.PI/180,v=dir.clone();
  v.x+=(Math.random()-.5)*2*sp;v.y+=(Math.random()-.5)*2*sp;v.z+=(Math.random()-.5)*2*sp;v.normalize();
  const r=raycast(origin,v,d.range,c);
  if(i<3||d.pel===1)tracer(muzzle,r.p,0xfff2b0);
  if(r.type==='char'){const fall=1-.35*clamp(r.t/d.range,0,1);const hs=r.head;
   let dm=w.dmg*fall*(hs?1.8:1)*(c.isPlayer?1:.6);damage(r.c,dm,c,d.name,hs);puff(r.p,0xb04040,3,2);
   if(c.isPlayer){const h=$('hitmarker');h.className='show'+(hs?' head':'');clearTimeout(h.t);h.t=setTimeout(()=>h.className='',90);sfx('hit',.7)}}
  else if(r.type==='car'){r.v.hp-=w.dmg*.5;puff(r.p,0xffcc66,4,3);if(r.v.hp<=0&&!r.v.dead)explodeCar(r.v)}
  else if(r.type==='build'){puff(r.p,0xc9a46a,4,2.5);if(r.c.hp<9000){r.c.hp-=w.dmg;if(r.c.hp<=0)killCollider(r.c)}}
  else if(r.type!=='none')puff(r.p,0xcfcfcf,3,2.5)}}
const tmpV=new THREE.Vector3(),camFwd=new THREE.Vector3(),camPos=new THREE.Vector3();
let camDist=3.6;
function doShoot(dt){
 const w=P.wep;if(P.fireT>0)P.fireT-=dt;if(P.reloadT>0){P.reloadT-=dt;if(P.reloadT<=0){const need=w?w.def.mag-w.mag:0,take=w?Math.min(need,P.ammo[w.def.ammo]):0;if(w){w.mag+=take;P.ammo[w.def.ammo]-=take}hudSlots()}return}
 if(P.build){return}
 if(!w){// pickaxe
  if(mdown&&P.swing<=0){P.swing=.001;P.swingHit=false}
  if(P.swing>0){P.swing+=dt/.4;if(P.swing>.45&&!P.swingHit){P.swingHit=true;harvest()}if(P.swing>=1)P.swing=0}return}
 if(mdown&&P.fireT<=0){
  if(w.mag<=0){startReload();return}
  if(!w.def.auto&&P.holdShot){return}
  P.holdShot=!w.def.auto;P.fireT=w.def.rate;w.mag--;
  const mv=P.speed>1?1.4:1,am=(rdown?.35:1)*mv;
  camFwd.set(0,0,-1).applyQuaternion(camera.quaternion);
  const org=camPos.clone().addScaledVector(camFwd,camDist+.4);
  const mz=new THREE.Vector3(P.pos.x,P.pos.y+1.45,P.pos.z).add(tmpV.set(Math.cos(P.yaw)*.3-Math.sin(P.yaw)*.8,0,-Math.sin(P.yaw)*.3-Math.cos(P.yaw)*.8));
  fireWeapon(P,org,camFwd,w,am,mz);camPitch+=w.def.kick*(rdown?.6:1);camYaw+=(Math.random()-.5)*w.def.kick*.6;hudSlots();
  if(w.mag<=0&&P.ammo[w.def.ammo]>0)setTimeout(startReload,200)}
 if(!mdown)P.holdShot=false}
function harvest(){const f=new THREE.Vector3(-Math.sin(camYaw),0,-Math.cos(camYaw));let best=null,bd=1e9;
 for(const o of gGet(rgrid,P.pos.x+f.x*1.6,P.pos.z+f.z*1.6,3.2)){const dx=o.x-P.pos.x,dz=o.z-P.pos.z,d=Math.hypot(dx,dz)-o.r;if(d<2.3&&(dx*f.x+dz*f.z)/Math.max(.01,Math.hypot(dx,dz))>.35&&d<bd){bd=d;best=o}}
 for(const c of chars)if(c!==P&&c.alive&&Math.hypot(c.pos.x-P.pos.x,c.pos.z-P.pos.z)<2.1){damage(c,22,P,'Pickaxe');sfx('hit',.8);puff(new THREE.Vector3(c.pos.x,c.pos.y+1.2,c.pos.z),0xb04040,3,2)}
 if(best){best.hp--;P.mats+=best.kind==='rock'?14:10;sfx('thud',1);puff(new THREE.Vector3(best.x,P.pos.y+1.2,best.z),best.kind==='rock'?0xcccccc:0x7aa84a,5,2.5);
  if(best.hp<=0){fellTree(best);P.mats+=20}hudSlots()}}

// ---------- building
const ghost=new THREE.Mesh(boxGeo,new THREE.MeshBasicMaterial({color:0x66b8ff,transparent:true,opacity:.4,depthWrite:false}));ghost.visible=false;scene.add(ghost);
const placed=new Set();
function buildSpec(){camFwd.set(0,0,-1).applyQuaternion(camera.quaternion);
 const fx=-Math.sin(camYaw),fz=-Math.cos(camYaw);
 const tx=P.pos.x+fx*3,tz=P.pos.z+fz*3,cx=Math.round(tx/4)*4,cz=Math.round(tz/4)*4;
 const ax=Math.abs(fx)>Math.abs(fz),sgn=ax?Math.sign(fx):Math.sign(fz),by=Math.round(P.pos.y*20)/20;
 const t=P.piece;
 if(t===1){const along=ax?'z':'x';return{type:'wall',cx:ax?cx+sgn*2:cx,cz:ax?cz:cz+sgn*2,by,along}}
 if(t===2)return{type:'floor',cx,cz,by};
 return{type:'ramp',cx,cz,by,dir:ax?(sgn>0?'+x':'-x'):(sgn>0?'+z':'-z')}}
function specMesh(s){const th=Math.atan2(3,4);
 if(s.type==='wall'){const w=s.along==='z';return{sc:[w?.3:4,3,w?4:.3],pos:[s.cx,s.by+1.5,s.cz],rot:[0,0,0]}}
 if(s.type==='floor')return{sc:[4,.3,4],pos:[s.cx,s.by-.15,s.cz],rot:[0,0,0]};
 const d=s.dir;const L=5;
 if(d==='+x')return{sc:[L,.3,4],pos:[s.cx,s.by+1.5-.15,s.cz],rot:[0,0,th]};
 if(d==='-x')return{sc:[L,.3,4],pos:[s.cx,s.by+1.5-.15,s.cz],rot:[0,0,-th]};
 if(d==='+z')return{sc:[4,.3,L],pos:[s.cx,s.by+1.5-.15,s.cz],rot:[-th,0,0]};
 return{sc:[4,.3,L],pos:[s.cx,s.by+1.5-.15,s.cz],rot:[th,0,0]}}
function placeBuild(){const s=buildSpec(),k=`${s.type}${s.cx},${s.cz},${s.by.toFixed(1)},${s.along||s.dir||''}`;
 if(placed.has(k)||P.mats<10)return;placed.add(k);P.mats-=10;
 const m=specMesh(s),mesh=new THREE.Mesh(boxGeo,matWood);mesh.scale.set(...m.sc);mesh.position.set(...m.pos);mesh.rotation.set(...m.rot);mesh.castShadow=mesh.receiveShadow=true;buildGroup.add(mesh);
 let c;
 if(s.type==='wall'){const w=s.along==='z';c=addBoxCollider(s.cx-(w?.15:2),s.cx+(w?.15:2),s.cz-(w?2:.15),s.cz+(w?2:.15),s.by,s.by+3,mesh,{})}
 else if(s.type==='floor')c=addBoxCollider(s.cx-2,s.cx+2,s.cz-2,s.cz+2,s.by-.3,s.by,mesh,{});
 else c=addBoxCollider(s.cx-2,s.cx+2,s.cz-2,s.cz+2,s.by,s.by+3,mesh,{ramp:{dir:s.dir,lo:s.by,hi:s.by+3}});
 c.hp=160;sfx('thud',.8);puff(new THREE.Vector3(s.cx,s.by+1,s.cz),0xc9a46a,5,2);hudSlots()}
let buildLatch=false;
function updateBuild(){if(!P.build){ghost.visible=false;return}
 const s=buildSpec(),m=specMesh(s);ghost.visible=true;ghost.scale.set(...m.sc);ghost.position.set(...m.pos);ghost.rotation.set(...m.rot);
 ghost.material.color.set(P.mats>=10?0x66b8ff:0xff6666);
 if(mdown&&!buildLatch){placeBuild();buildLatch=true}if(!mdown)buildLatch=false}

// ---------- player update
function updatePlayer(dt){
 if(!P.alive)return;
 const fx=-Math.sin(camYaw),fz=-Math.cos(camYaw),rx=Math.cos(camYaw),rz=-Math.sin(camYaw);
 let ix=(keys.KeyD?1:0)-(keys.KeyA?1:0),iz=(keys.KeyW?1:0)-(keys.KeyS?1:0);
 const il=Math.hypot(ix,iz);if(il>0){ix/=il;iz/=il}
 const mvx=fx*iz+rx*ix,mvz=fz*iz+rz*ix;
 if(P.state==='bus'){const bp=busPos(G.busT);P.pos.copy(bp);P.model.visible=false;if(G.busT*BUS_SPEED>=BUS_LEN)leaveBus();return}
 if(P.state==='fall'){P.fallT+=dt;P.vy=Math.max(P.vy-22*dt,-46);P.hv.x=lerp(P.hv.x,fx*(iz>0?30:iz<0?4:12),dt*1.5);P.hv.z=lerp(P.hv.z,fz*(iz>0?30:iz<0?4:12),dt*1.5);
  P.pos.x+=P.hv.x*dt;P.pos.z+=P.hv.z*dt;P.pos.y+=P.vy*dt;P.speed=0;
  const gh=groundAt(P.pos.x,P.pos.z,P.pos.y);if(P.pos.y-gh<95&&P.fallT>.5)deployGlider();if(P.pos.y<=gh)land();return}
 if(P.state==='glide'){P.vy=lerp(P.vy,-9,dt*2);const sp=iz>0?24:iz<0?8:15;P.hv.x=lerp(P.hv.x,fx*sp,dt*1.2);P.hv.z=lerp(P.hv.z,fz*sp,dt*1.2);
  P.pos.x+=P.hv.x*dt;P.pos.z+=P.hv.z*dt;P.pos.y+=P.vy*dt;P.yaw=lerp(P.yaw,camYaw,dt*4);
  if(P.pos.y<=groundAt(P.pos.x,P.pos.z,P.pos.y)+.05)land();return}
 if(P.state==='car'){driveCar(P.car,dt,true);P.pos.set(P.car.x,P.car.y,P.car.z);return}
 // ground
 const inWater=terrainH(P.pos.x,P.pos.z)<WATER-.9&&P.pos.y<=WATER-.5;
 let sp=inWater?3.2:(keys.ShiftLeft||keys.ShiftRight)&&iz>0?9.6:6.2;if(rdown)sp*=.6;if(P.wep&&mdown)sp*=.85;
 P.hv.x=lerp(P.hv.x,mvx*sp,Math.min(1,dt*(P.onGround?12:2)));P.hv.z=lerp(P.hv.z,mvz*sp,Math.min(1,dt*(P.onGround?12:2)));
 P.speed=Math.hypot(P.hv.x,P.hv.z);
 if(keys.Space&&P.onGround&&!inWater&&!P.build){P.vy=8.2;P.onGround=false}
 P.vy-=26*dt;P.pos.x+=P.hv.x*dt;P.pos.z+=P.hv.z*dt;P.pos.y+=P.vy*dt;
 resolve(P.pos,.38,1.8);
 let gh=groundAt(P.pos.x,P.pos.z,P.pos.y);
 if(inWater){P.pos.y=lerp(P.pos.y,WATER-.9,dt*6);P.vy=0;P.onGround=true}
 else if(P.pos.y<=gh){P.pos.y=gh;P.vy=Math.max(0,P.vy);P.onGround=true}
 else if(P.onGround&&P.vy<=0&&P.pos.y-gh<.45){P.pos.y=gh}else P.onGround=false;
 // facing
 if(mdown||rdown||P.fireT>-.0&&P.fireT>0)P.yaw=lerp(P.yaw,camYaw,Math.min(1,dt*14));
 else if(P.speed>.5)P.yaw=lerpAngle(P.yaw,Math.atan2(-P.hv.x,-P.hv.z),Math.min(1,dt*10));
 doShoot(dt);updateBuild();
 nearTarget=findInteract();const pr=$('prompt');if(nearTarget&&!P.build){pr.textContent=nearTarget.txt;pr.style.display='block'}else pr.style.display='none'}
function lerpAngle(a,b,t){let d=((b-a+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;return a+d*t}
function land(){P.state='ground';if(P.glider){P.model.remove(P.glider);P.glider=null}P.pos.y=groundAt(P.pos.x,P.pos.z,P.pos.y);P.vy=0;P.onGround=true;P.hv.set(0,0,0);refreshHeld();hudSlots();banner('Find weapons · open chests with E · chop trees for materials',4000)}

// ---------- car physics
const carTmp=new THREE.Vector3();
function driveCar(v,dt,isPlayer){
 let th=0,st=0,hb=false,boost=false;
 if(isPlayer){th=(keys.KeyW?1:0)-(keys.KeyS?1:0);st=(keys.KeyD?1:0)-(keys.KeyA?1:0);hb=!!keys.Space;boost=keys.ShiftLeft||keys.ShiftRight}
 const maxF=boost?46:34;
 if(th>0)v.speed+=(v.speed<0?40:(boost?30:22))*dt;else if(th<0)v.speed-=(v.speed>0?40:14)*dt;else v.speed*=1-Math.min(1,1.1*dt);
 v.speed=clamp(v.speed,-12,maxF);if(hb)v.speed*=1-Math.min(1,3.5*dt);
 v.heading-=st*(v.speed/(Math.abs(v.speed)+7))*1.7*dt*(hb?1.5:1);
 const fx=-Math.sin(v.heading),fz=-Math.cos(v.heading);
 v.x+=fx*v.speed*dt;v.z+=fz*v.speed*dt;
 // tree ram
 for(const o of gGet(rgrid,v.x+fx*2,v.z+fz*2,2.5)){if(o.kind==='tree'&&Math.abs(v.speed)>13&&Math.hypot(o.x-v.x,o.z-v.z)<2.6){fellTree(o);v.speed*=.7;v.hp-=20;puff(new THREE.Vector3(o.x,v.y+1,o.z),0x7aa84a,8,4);sfx('thud',1.2)}}
 carTmp.set(v.x,v.y,v.z);const hit=resolve(carTmp,1.45,1.6,.45);
 if(hit){const imp=Math.abs(v.speed);v.x=carTmp.x;v.z=carTmp.z;if(imp>6){v.hp-=imp*1.8;sfx('thud',1.3);puff(carTmp.clone().setY(v.y+1),0xffaa44,6,3)}v.speed*=-.25}
 // ground sampling
 const L=v.len/2-.6,W=v.wid/2,sy=Math.sin(v.heading),cy=Math.cos(v.heading);
 const hs=[[-W,-L],[W,-L],[-W,L],[W,L]].map(([wx,wz])=>{const x=v.x+wx*cy+wz*sy,z=v.z-wx*sy+wz*cy;return Math.max(groundAt(x,z,v.y,1.1),WATER-.9)});
 const front=(hs[0]+hs[1])/2,back=(hs[2]+hs[3])/2,left=(hs[0]+hs[2])/2,right=(hs[1]+hs[3])/2;
 const ty=(front+back)/2+.05,tp=Math.atan2(back-front,L*2)*-1*-1,tr=Math.atan2(left-right,W*2);
 v.y=lerp(v.y,ty,Math.min(1,dt*14));v.pitch=lerp(v.pitch,-Math.atan2(front-back,L*2),Math.min(1,dt*8));v.roll=lerp(v.roll,Math.atan2(left-right,W*2)*-1,Math.min(1,dt*8));
 if(terrainH(v.x,v.z)<WATER-.5)v.speed*=1-Math.min(1,2.2*dt);
 for(const w of v.wheels)w.rotation.x-=v.speed*dt/.42;
 // roadkill
 for(const c of chars){if(!c.alive||c===v.driver||c.state==='car'||c.state==='glide'||c.state==='fall'||c.state==='bus')continue;
  if(Math.abs(v.speed)>7&&Math.hypot(c.pos.x-v.x,c.pos.z-v.z)<2.1&&Math.abs(c.pos.y-v.y)<2&&(!c.rk||G.t-c.rk>.5)){c.rk=G.t;damage(c,Math.abs(v.speed)*2.6,v.driver||null,'Car');v.speed*=.85}}
 if(v.hp<=0&&!v.dead)explodeCar(v);
 updCarMesh(v);
 if(isPlayer&&engOsc){engOsc.frequency.value=50+Math.abs(v.speed)*5}}

// ---------- camera
function updateCamera(dt){
 const car=P.state==='car';
 camera.rotation.set(camPitch,camYaw,0);
 let tgt;
 if(P.state==='bus'){const bp=busPos(G.busT);tgt=bp.clone();camDist=45;camera.rotation.set(-.35,camYaw,0)}
 else{tgt=new THREE.Vector3(P.pos.x,P.pos.y+(car?2:1.65),P.pos.z);camDist=car?8:(P.state==='glide'||P.state==='fall')?7.5:(rdown?2.2:3.6)}
 const off=tmpV.set(P.state==='bus'?0:(car?0:rdown?.45:.7),P.state==='bus'?12:.15,camDist).applyQuaternion(camera.quaternion);
 camPos.copy(tgt).add(off);
 if(P.state!=='bus'){const dir=camPos.clone().sub(tgt),len=dir.length();dir.normalize();const hit0=raycastEnv(tgt,dir,len,.3);const hit=hit0&&hit0.type!=='prop'?hit0:null;if(hit)camPos.copy(tgt).addScaledVector(dir,Math.max(.6,hit.t-.3));
  const th=terrainH(camPos.x,camPos.z)+.4;if(camPos.y<th)camPos.y=th}
 camera.position.copy(camPos);
 const w=P.wep;const targetFov=rdown&&w&&w.def.scope&&P.state==='ground'?24:rdown&&P.state==='ground'?55:(P.state==='fall'?80:70);
 camera.fov=lerp(camera.fov,targetFov,Math.min(1,dt*10));camera.updateProjectionMatrix();
 $('crosshair').style.display=(P.state==='ground'&&!P.build&&!(rdown&&w&&w.def.scope))?'block':'none'}

// ---------- storm
const PH=[{wait:50,shrink:38,r:210,dmg:1.2},{wait:35,shrink:30,r:130,dmg:2.5},{wait:30,shrink:26,r:70,dmg:5},{wait:25,shrink:20,r:30,dmg:9},{wait:15,shrink:14,r:3,dmg:14}];
const storm={cx:0,cz:0,r:R*1.2,fromR:R*1.2,fromX:0,fromZ:0,toX:0,toZ:0,toR:R*1.2,phase:-1,t:0,state:'wait',dur:50,dmg:0};
{ // initial phase 0 wait; target for phase 0
 const pick0=()=>{const a=Math.random()*6.28,d=Math.random()*60;return[Math.cos(a)*d,Math.sin(a)*d]};
 const [x,z]=pick0();Object.assign(storm,{phase:0,t:0,state:'wait',dur:PH[0].wait,fromR:R*1.2,r:R*1.2,toR:PH[0].r,toX:x,toZ:z,fromX:0,fromZ:0,dmg:PH[0].dmg})}
const stormWall=new THREE.Mesh(new THREE.CylinderGeometry(1,1,500,64,1,true),new THREE.MeshBasicMaterial({color:0x8a4bff,transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false,fog:false}));stormWall.position.y=150;scene.add(stormWall);
const stormRing=new THREE.Mesh(new THREE.RingGeometry(.995,1,96).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.5,fog:false}));stormRing.position.y=1;scene.add(stormRing);
function updateStorm(dt){
 storm.t+=dt;
 if(storm.state==='wait'){if(storm.t>=storm.dur){storm.state='shrink';storm.t=0;storm.dur=PH[storm.phase].shrink;storm.fromR=storm.r;storm.fromX=storm.cx;storm.fromZ=storm.cz;banner('The storm is closing in!',2500)}}
 else{const k=clamp(storm.t/storm.dur,0,1);storm.r=lerp(storm.fromR,storm.toR,k);storm.cx=lerp(storm.fromX,storm.toX,k);storm.cz=lerp(storm.fromZ,storm.toZ,k);
  if(k>=1){const n=storm.phase+1;if(n<PH.length){const nr=PH[n].r,a=Math.random()*6.28,d=Math.random()*Math.max(0,storm.r-nr)*.8;
    Object.assign(storm,{phase:n,state:'wait',t:0,dur:PH[n].wait,toR:nr,toX:storm.cx+Math.cos(a)*d,toZ:storm.cz+Math.sin(a)*d,dmg:PH[n].dmg});feed('Storm eye moving…')}else storm.t=0}}
 stormWall.scale.set(storm.r,1,storm.r);stormWall.position.x=storm.cx;stormWall.position.z=storm.cz;
 stormRing.scale.set(storm.r,1,storm.r);stormRing.position.set(storm.cx,.2,storm.cz);
 stormRing.visible=false;
 // next circle ring
 for(const c of chars){if(!c.alive||c.state==='bus')continue;
  if(Math.hypot(c.pos.x-storm.cx,c.pos.z-storm.cz)>storm.r){c.stormT=(c.stormT||0)+dt;if(c.stormT>=1){c.stormT-=1;damage(c,storm.dmg,null,'')}}}
 const inS=Math.hypot(P.pos.x-storm.cx,P.pos.z-storm.cz)>storm.r&&P.state!=='bus';
 $('stormVig').classList.toggle('on',inS&&P.alive);
 const m=Math.floor(Math.max(0,storm.dur-storm.t)/60),s=Math.floor(Math.max(0,storm.dur-storm.t)%60);
 $('stormInfo').textContent=(storm.state==='wait'?'⛈ Storm forms in ':'⛈ Storm closing  ')+`${m}:${String(s).padStart(2,'0')}`+(inS?'  — YOU ARE IN THE STORM':'')}

// ---------- bots
const BOTNAMES=['Hawk','Juniper','Moss','Rook','Ember','Slate','Willow','Talon','Briar','Nova','Cedar','Fox','Granite','Wren','Ash','Lynx','Sable','Thorn','Dusk','Kestrel','Birch','Onyx','Raven','Sage','Flint','Marlow','Zephyr','Quill','Bramble'];
const bots=[];
function spawnBots(){
 for(let i=0;i<29;i++){const sk=pick(SKINS);const name=BOTNAMES[i%BOTNAMES.length];const model=makeChar(sk,name);model.visible=false;scene.add(model);
  const wk=pick(WKEYS),b={isPlayer:false,name,pos:new THREE.Vector3(),vy:0,hv:new THREE.Vector3(),yaw:Math.random()*6.28,hp:100,shield:Math.random()<.4?50:0,alive:true,kills:0,state:'bus',model,
   wep:newWeapon(wk,rollRarity()),dropT:rand(1.5,G.busLen*.85),target:null,tgtChar:null,fireT:rand(.5,1.5),relT:0,losT:0,seeing:false,stuck:0,wanderT:0,speed:0,glider:null,strafe:Math.random()<.5?1:-1,strT:0,landedT:0};
  setGun(model,b.wep.key);chars.push(b);bots.push(b)}}
function pickBotTarget(b){
 if(Math.hypot(b.pos.x-storm.cx,b.pos.z-storm.cz)>storm.r*.8){const a=Math.random()*6.28,d=Math.random()*storm.r*.5;return[storm.cx+Math.cos(a)*d,storm.cz+Math.sin(a)*d]}
 if(Math.random()<.5){const p=pick(POIS);return[p.x+rand(-30,30),p.z+rand(-30,30)]}
 const a=Math.random()*6.28,d=rand(15,60);return[b.pos.x+Math.cos(a)*d,b.pos.z+Math.sin(a)*d]}
function updateBot(b,dt){
 const P0=b.model.userData.P;
 if(!b.alive){b.deadT+=dt;if(b.deadT>25)b.model.visible=false;return}
 if(b.state==='bus'){if(G.busT>=b.dropT){const bp=busPos(G.busT);b.pos.copy(bp);b.pos.y-=6;b.state='glide';b.model.visible=true;b.glider=makeGlider(pick([0xc0392b,0x2980b9,0xd4a017,0x8e44ad,0x16a085]));b.model.add(b.glider);
   const p=Math.random()<.7?pick(POIS):null;b.land=p?[p.x+rand(-25,25),p.z+rand(-25,25)]:(()=>{const s=landSpot(2,20);return s?[s[0],s[1]]:[0,0]})()}
  b.model.position.copy(b.pos);return}
 if(b.state==='glide'){const dx=b.land[0]-b.pos.x,dz=b.land[1]-b.pos.z,d=Math.hypot(dx,dz)||1,gh=groundAt(b.pos.x,b.pos.z,b.pos.y),alt=b.pos.y-gh;
  const sp=Math.min(26,Math.max(8,d/Math.max(.5,alt/14)));const vd=alt>110?30:11;
  if(d>3){b.pos.x+=dx/d*sp*dt;b.pos.z+=dz/d*sp*dt}b.pos.y-=(alt>110?30:Math.max(9,alt/Math.max(.5,d/sp)))*dt;
  b.yaw=Math.atan2(-dx,-dz);if(b.pos.y<=gh+.05){b.state='ground';b.model.remove(b.glider);b.glider=null;b.pos.y=gh;b.landedT=0}
  P0.armed=false;animChar(b.model,0,G.t,alt>110?'fall':'glide',0,0);b.model.position.copy(b.pos);b.model.rotation.y=b.yaw;return}
 // ground AI
 b.landedT+=dt;b.losT-=dt;b.fireT-=dt;
 if(b.relT>0){b.relT-=dt;if(b.relT<=0)b.wep.mag=b.wep.def.mag}
 if(b.losT<=0){b.losT=.3;let best=null,bd=60;
  for(const c of chars){if(c===b||!c.alive||c.state==='bus')continue;if(c.isPlayer?false:c.state!=='ground')continue;const d=Math.hypot(c.pos.x-b.pos.x,c.pos.z-b.pos.z);if(d>=bd)continue;
   const o=tmpV.set(b.pos.x,b.pos.y+1.5,b.pos.z),dir=new THREE.Vector3(c.pos.x-b.pos.x,c.pos.y+1.1-o.y,c.pos.z-b.pos.z),L=dir.length();dir.normalize();
   const r=raycastEnv(o,dir,L,.7);if(!r){best=c;bd=d}}
  b.tgtChar=best;b.seeing=!!best}
 const t=b.tgtChar;let mx=0,mz=0,sp=5.2;
 if(t&&b.seeing&&b.landedT>3){
  const dx=t.pos.x-b.pos.x,dz=t.pos.z-b.pos.z,d=Math.hypot(dx,dz);b.yaw=lerpAngle(b.yaw,Math.atan2(-dx,-dz),Math.min(1,dt*8));
  b.strT-=dt;if(b.strT<=0){b.strT=rand(.8,2);b.strafe=-b.strafe}
  const prefer=b.wep.def.range>150?45:b.wep.key==='thunder'?10:22;
  const fwd=d>prefer+4?1:d<prefer-4?-1:0;const ux=dx/d,uz=dz/d;mx=ux*fwd+(-uz)*b.strafe*.7;mz=uz*fwd+ux*b.strafe*.7;
  if(b.fireT<=0&&b.relT<=0&&d<b.wep.def.range*.85){
   if(b.wep.mag<=0){b.relT=b.wep.def.rel}
   else{b.wep.mag--;b.fireT=b.wep.def.rate*(b.wep.def.auto?1.8:1.4)+rand(0,.25);
    const o=new THREE.Vector3(b.pos.x,b.pos.y+1.5,b.pos.z),aim=new THREE.Vector3(t.pos.x-o.x,t.pos.y+1.15-o.y,t.pos.z-o.z).normalize();
    const mz2=o.clone().addScaledVector(aim,.9);fireWeapon(b,o,aim,b.wep,2.1,mz2)}}}
 else{b.wanderT-=dt;if(!b.target||b.wanderT<=0||Math.hypot(b.target[0]-b.pos.x,b.target[1]-b.pos.z)<3){b.target=pickBotTarget(b);b.wanderT=rand(8,16)}
  const dx=b.target[0]-b.pos.x,dz=b.target[1]-b.pos.z,d=Math.hypot(dx,dz)||1;mx=dx/d;mz=dz/d;
  b.yaw=lerpAngle(b.yaw,Math.atan2(-mx,-mz),Math.min(1,dt*6));sp=Math.hypot(b.pos.x-storm.cx,b.pos.z-storm.cz)>storm.r?8:5.4}
 const ox=b.pos.x,oz=b.pos.z;
 b.pos.x+=mx*sp*dt;b.pos.z+=mz*sp*dt;
 if(terrainH(b.pos.x,b.pos.z)<WATER-.6){b.pos.x=ox;b.pos.z=oz;b.target=null;b.wanderT=0}
 b.vy-=26*dt;b.pos.y+=b.vy*dt;resolve(b.pos,.38,1.8);
 const gh=groundAt(b.pos.x,b.pos.z,b.pos.y);if(b.pos.y<=gh+.05){b.pos.y=gh;b.vy=0}
 b.speed=Math.hypot(b.pos.x-ox,b.pos.z-oz)/dt;
 if(b.speed<.5&&(mx||mz)){b.stuck+=dt;if(b.stuck>1.2){b.stuck=0;b.target=null;b.wanderT=0;b.vy=7}}else b.stuck=0;
 P0.armed=true;animChar(b.model,b.speed,G.t,'ground',0,0);b.model.position.copy(b.pos);b.model.rotation.y=b.yaw}

// ---------- minimap
const mm=$('minimap'),mc=mm.getContext('2d'),mmBase=document.createElement('canvas');mmBase.width=mmBase.height=180;
{const x=mmBase.getContext('2d'),im=x.createImageData(180,180);for(let j=0;j<180;j++)for(let i=0;i<180;i++){const wx=(i/180-.5)*2*(R+20),wz=(j/180-.5)*2*(R+20),h=terrainH(wx,wz);let c;
 if(h<WATER)c=[40,100,140];else if(h<1.2)c=[200,188,140];else if(h<18)c=[70+h*2,120+h,60];else c=[130,128,118];const k=(j*180+i)*4;im.data.set([c[0],c[1],c[2],255],k)}x.putImageData(im,0,0)}
const w2m=(x,z)=>[(x/(R+20)/2+.5)*180,(z/(R+20)/2+.5)*180];
function drawMinimap(){mc.clearRect(0,0,180,180);mc.drawImage(mmBase,0,0);
 // storm
 mc.save();mc.fillStyle='rgba(140,60,255,.35)';mc.beginPath();mc.rect(0,0,180,180);const[sx,sz]=w2m(storm.cx,storm.cz),sr=storm.r/(R+20)*90;mc.arc(sx,sz,sr,0,6.28,true);mc.fill('evenodd');mc.restore();
 mc.strokeStyle='#fff';mc.lineWidth=1.5;mc.beginPath();const[tx,tz]=w2m(storm.toX,storm.toZ);mc.arc(tx,tz,storm.toR/(R+20)*90,0,6.28);mc.stroke();
 mc.font='bold 8px sans-serif';mc.fillStyle='#fff';mc.textAlign='center';for(const p of POIS){const[x,z]=w2m(p.x,p.z);mc.fillText(p.name,x,z)}
 mc.fillStyle='#ff9f1c';for(const v of vehicles){if(v.dead)continue;const[x,z]=w2m(v.x,v.z);mc.fillRect(x-1.5,z-1.5,3,3)}
 if(P.state==='bus'||G.busT*BUS_SPEED<BUS_LEN){const bp=busPos(G.busT),[x,z]=w2m(bp.x,bp.z);mc.fillStyle='#fff';mc.beginPath();mc.arc(x,z,4,0,6.28);mc.fill()}
 const[px,pz]=w2m(P.pos.x,P.pos.z);mc.save();mc.translate(px,pz);mc.rotate(-camYaw);mc.fillStyle='#ffe14a';mc.strokeStyle='#000';mc.beginPath();mc.moveTo(0,-6);mc.lineTo(4,4);mc.lineTo(-4,4);mc.closePath();mc.fill();mc.stroke();mc.restore();
 }

// ---------- main loop
G.busLen=BUS_LEN/BUS_SPEED;
function startGame(){
 audio();
 P.name=($('nameIn').value||'Survivor').slice(0,14);
 P.model=makeChar(SKINS[selSkin],null);scene.add(P.model);P.model.visible=false;
 spawnBots();aliveCount=30;$('alive').textContent=30;
 G.started=true;G.t=0;G.busT=0;
 $('menu').classList.add('hidden');$('hud').classList.remove('hidden');
 camYaw=Math.atan2(-BUS_DIR.x,-BUS_DIR.z);camPitch=-.3;
 hudSlots();banner('Press SPACE to jump from the airship',4000);
 canvas.requestPointerLock();}
$('playBtn').onclick=startGame;
$('againBtn').onclick=()=>location.reload();
$('menu').addEventListener('keydown',e=>e.stopPropagation());
const clock=new THREE.Clock();let frame=0;
function animateItems(dt){for(const it of items){it.t+=dt;it.g.rotation.y+=dt*1.5;it.body.position.y=Math.sin(it.t*2)*.08}
 for(const c of chests){if(!c.opened)c.glow.material.opacity=.18+Math.sin(G.t*3)*.06}}
function loop(){
 requestAnimationFrame(loop);
 const dt=Math.min(clock.getDelta(),.05);frame++;
 water.material.opacity=.8+Math.sin(performance.now()/1200)*.03;
 for(const c of clouds){c.position.x+=dt*2;if(c.position.x>900)c.position.x=-900}
 if(G.started){
  G.t+=dt;if(!G.over||true)G.busT+=dt;
  bus.position.copy(busPos(G.busT));if(G.busT*BUS_SPEED>=BUS_LEN)bus.position.y+=0;
  if(!G.over||!P.alive)updatePlayer(dt);else updatePlayer(dt);
  for(const v of vehicles)if(!v.driver&&!v.dead){// idle: settle on ground
   v.speed*=1-Math.min(1,1.5*dt);if(Math.abs(v.speed)>.2)driveCar(v,dt,false)}
  for(const b of bots)updateBot(b,dt);
  updateStorm(dt);animateItems(dt);
  // player model sync
  if(P.state!=='bus'&&P.state!=='car'&&P.alive){P.model.position.copy(P.pos);P.model.rotation.y=P.yaw;
   animChar(P.model,P.speed,G.t,P.state==='ground'?'ground':P.state,0,P.swing);if(P.state==='ground'||P.state==='glide'){if(P.state==='ground')P.model.rotation.x=0}}
  else if(!P.alive){P.deadT=(P.deadT||0)+dt}
  updateCamera(dt);
  // HUD
  $('hpBar').style.width=clamp(P.hp,0,100)+'%';$('hpTxt').textContent=Math.ceil(Math.max(0,P.hp));$('shieldBar').style.width=clamp(P.shield,0,100)+'%';$('shieldTxt').textContent=Math.ceil(P.shield);
  $('mmInfo').textContent=P.state==='car'?`🚗 ${Math.round(Math.abs(P.car.speed)*3.6)} km/h`:'';
  if(P.state==='car'){const pr=$('prompt');pr.textContent='E — Exit car  ·  WASD drive · Shift boost · Space handbrake';pr.style.display='block';nearTarget={type:'exit'}}
  if(frame%2===0)drawMinimap();
  // sun / shadows follow
  const f=P.state==='bus'?bus.position:P.pos;sun.position.set(f.x+SUNDIR.x*120,f.y+SUNDIR.y*120,f.z+SUNDIR.z*120);sun.target.position.copy(f);
  window._sky.position.copy(camera.position);
 }else{
  // menu fly-around
  const t=performance.now()/9000;camera.position.set(Math.cos(t)*160,70,Math.sin(t)*160);camera.lookAt(0,5,0);
  window._sky.position.copy(camera.position)}
 updateFx(dt);
 renderer.render(scene,camera)}
loop();
window.__wf={P,G,chars,storm,startGame,cabins,vehicles,items,chests,land,refreshHeld,hudSlots,giveItem,newWeapon,enterCar,keys};
