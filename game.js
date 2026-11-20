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
const S=10;
const ROOMS=[{n:'Kitchen',x0:-8.1,x1:3.1,z0:-4.1,z1:8.1},{n:'Living Room',x0:-20.1,x1:-8.1,z0:-4.1,z1:8.1},{n:'Hallway',x0:.9,x1:3.1,z0:-20.1,z1:-4.1},{n:'Suite',x0:-12.1,x1:.9,z0:-16.1,z1:-4.1},{n:'Study',x0:3.1,x1:12.1,z0:-19.1,z1:-5.9}];
function terrainH(x,z){for(const r of ROOMS)if(x>=r.x0*S&&x<=r.x1*S&&z>=r.z0*S&&z<=r.z1*S)return 0;return -60}
// ---------- renderer / scene
const canvas=$('c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
const scene=new THREE.Scene();
const FOG=0xe8d6b4;
scene.fog=new THREE.FogExp2(FOG,0.00012);
const camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.1,2500);
camera.rotation.order='YXZ';
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()});

// sky dome
{const g=new THREE.SphereGeometry(1800,32,16);
 const m=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
  uniforms:{top:{value:new THREE.Color(0x2a62b5)},mid:{value:new THREE.Color(0x86b6e2)},bot:{value:new THREE.Color(FOG)}},
  vertexShader:'varying vec3 p;void main(){p=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying vec3 p;uniform vec3 top,mid,bot;void main(){vec3 d=normalize(p);float h=d.y;vec3 c=h<0.?bot:mix(mix(bot,mid,pow(smoothstep(0.,.35,h),.6)),top,smoothstep(.25,1.,h));vec3 sd=normalize(vec3(.86,.4,.12));float s=max(dot(d,sd),0.);c+=vec3(1.,.82,.55)*(pow(s,6.)*.25+pow(s,400.)*3.);c=mix(c,bot,exp(-max(h,0.)*9.)*.5);gl_FragColor=vec4(c,1.);}'});
 const s=new THREE.Mesh(g,m);s.renderOrder=-10;scene.add(s);window._sky=s}
{const es=new THREE.Scene();es.add(new THREE.Mesh(window._sky.geometry,window._sky.material));
 const pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromScene(es,0,1,4000).texture;scene.environmentIntensity=.35}
const hemi=new THREE.HemisphereLight(0xfff3df,0xd9c3a0,1.25);scene.add(hemi);scene.add(new THREE.AmbientLight(0xfff0dc,.85));
const sun=new THREE.DirectionalLight(0xffc88a,7.5);
const SUNDIR=new THREE.Vector3(.86,.4,.12).normalize();
sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);
Object.assign(sun.shadow.camera,{left:-120,right:120,top:120,bottom:-120,near:1,far:700});
sun.shadow.bias=-.0004;sun.shadow.normalBias=.4;
scene.add(sun,sun.target);
// sun glow + clouds
function radTex(inner,outer){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
 const g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,inner);g.addColorStop(1,outer);x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c)}
{const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:radTex('rgba(255,250,220,1)','rgba(255,240,200,0)'),fog:false,depthWrite:false,transparent:true}));
 sp.scale.set(420,420,1);sp.position.copy(SUNDIR).multiplyScalar(1500);scene.add(sp)}
const cloudTex=(()=>{const c=document.createElement('canvas');c.width=256;c.height=128;const x=c.getContext('2d');
 for(let i=0;i<70;i++){const px=40+Math.random()*176,py=70+Math.random()*28-Math.abs(px-128)*.18,r=14+Math.random()*26,g=x.createRadialGradient(px,py,0,px,py,r);
  g.addColorStop(0,'rgba(255,255,255,.35)');g.addColorStop(.6,'rgba(250,252,255,.15)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(px-r,py-r,r*2,r*2)}
 for(let i=0;i<30;i++){const px=60+Math.random()*136,py=82+Math.random()*16,r=10+Math.random()*18,g=x.createRadialGradient(px,py,0,px,py,r);g.addColorStop(0,'rgba(150,165,190,.18)');g.addColorStop(1,'rgba(150,165,190,0)');x.fillStyle=g;x.fillRect(px-r,py-r,r*2,r*2)}
 return new THREE.CanvasTexture(c)})();
const clouds=[];
for(let i=0;i<46;i++){const m=new THREE.SpriteMaterial({map:cloudTex,fog:false,transparent:true,opacity:rand(.5,.85),depthWrite:false});
 const s=new THREE.Sprite(m);const a=Math.random()*6.28,r=rand(100,900);
 s.position.set(Math.cos(a)*r,rand(170,300),Math.sin(a)*r);s.scale.set(rand(160,320),rand(50,90),1);clouds.push(s)}

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
function nmapFrom(size,fn,strength,rep){const h=new Float32Array(size*size);for(let j=0;j<size;j++)for(let i=0;i<size;i++)h[j*size+i]=fn(i,j);
 const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d'),im=x.createImageData(size,size);
 for(let j=0;j<size;j++)for(let i=0;i<size;i++){const l=h[j*size+(i+size-1)%size],r=h[j*size+(i+1)%size],u=h[((j+size-1)%size)*size+i],d=h[((j+1)%size)*size+i];
  let nx=(l-r)*strength,ny=(u-d)*strength,nz=1,L=Math.hypot(nx,ny,nz);const k=(j*size+i)*4;im.data[k]=(nx/L*.5+.5)*255;im.data[k+1]=(ny/L*.5+.5)*255;im.data[k+2]=(nz/L*.5+.5)*255;im.data[k+3]=255}
 x.putImageData(im,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep,rep);t.anisotropy=8;return t}
const tile=(i,j,f,sz)=>{const u=i/sz*f,v=j/sz*f;// tileable value noise
 const n=(a,b)=>{const ia=Math.floor(a),ib=Math.floor(b),fa=a-ia,fb=b-ib,w=f=>f*f*(3-2*f),H=(x,y)=>hash(((x%f)+f)%f,((y%f)+f)%f);return lerp(lerp(H(ia,ib),H(ia+1,ib),w(fa)),lerp(H(ia,ib+1),H(ia+1,ib+1),w(fa)),w(fb))};return n(u,v)};
let terrain=null;const waterN={offset:{set(){}}};const water={};
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
function addChest(x,y,z){
 const g=new THREE.Group();g.position.set(x,y,z);
 const body=mkBox(1,.55,.65,new THREE.MeshStandardMaterial({color:0x6a4530,metalness:.1,roughness:.5,emissive:0x3a2210,emissiveIntensity:.5}),0,.28,0,g);
 const lid=mkBox(1.02,.2,.67,new THREE.MeshStandardMaterial({color:0xc9a24a,metalness:.9,roughness:.3,emissive:0x4a3500,emissiveIntensity:.5}),0,.65,0,g);
 const glow=new THREE.Mesh(new THREE.CylinderGeometry(.35,.55,3,12,1,true),new THREE.MeshBasicMaterial({color:0xffcc44,transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide}));glow.position.y=1.7;g.add(glow);
 scene.add(g);chests.push({x,y,z,g,lid,glow,opened:false});
}
const cabins=[];const trees=[];
// ================= INTERIOR: a real-world apartment, you are shrunk (1 m = S units) =================
const WH=2.8,WT=.1;
const T={};
const rr_=mulberry(7),Rr=(a,b)=>a+rr_()*(b-a);
T.walnut=ctex(512,512,(x,w,h)=>{const g=x.createLinearGradient(0,0,w,0);g.addColorStop(0,'#5b3b27');g.addColorStop(.5,'#684430');g.addColorStop(1,'#573623');x.fillStyle=g;x.fillRect(0,0,w,h);
 for(let i=0;i<700;i++){const px=Rr(0,w),wd=Rr(.6,4),l=Math.random()<.5?'rgba(120,82,55,':'rgba(36,20,12,';x.strokeStyle=l+Rr(.05,.3)+')';x.lineWidth=wd;x.beginPath();x.moveTo(px,0);
  x.bezierCurveTo(px+Rr(-10,10),h*.3,px+Rr(-10,10),h*.6,px+Rr(-8,8),h);x.stroke()}
 for(let i=0;i<3;i++){const px=Rr(40,w-40),py=Rr(60,h-60);for(let k=1;k<7;k++){x.strokeStyle=`rgba(30,16,8,${.18-k*.02})`;x.lineWidth=1.2;x.beginPath();x.ellipse(px,py,5+k*4,12+k*10,0,0,7);x.stroke()}}},[1,1]);
T.oak=ctex(512,512,(x,w,h)=>{x.fillStyle='#d8bd95';x.fillRect(0,0,w,h);for(let i=0;i<600;i++){const px=Rr(0,w);x.strokeStyle=Math.random()<.5?`rgba(150,110,70,${Rr(.05,.2)})`:`rgba(245,225,195,${Rr(.05,.25)})`;x.lineWidth=Rr(.6,3);x.beginPath();x.moveTo(px,0);x.bezierCurveTo(px+Rr(-6,6),h*.3,px+Rr(-6,6),h*.6,px+Rr(-5,5),h);x.stroke()}},[1,1]);
T.quartz=ctex(512,512,(x,w,h)=>{x.fillStyle='#e8e1d2';x.fillRect(0,0,w,h);for(let i=0;i<30;i++){const px=Rr(0,w),py=Rr(0,h),r=Rr(40,120),g=x.createRadialGradient(px,py,0,px,py,r);g.addColorStop(0,'rgba(210,198,176,.25)');g.addColorStop(1,'rgba(210,198,176,0)');x.fillStyle=g;x.fillRect(px-r,py-r,2*r,2*r)}
 for(let i=0;i<22;i++){x.strokeStyle=`rgba(150,138,120,${Rr(.08,.28)})`;x.lineWidth=Rr(.5,2.2);x.beginPath();let px=Rr(0,w),py=Rr(0,h);x.moveTo(px,py);for(let k=0;k<5;k++){px+=Rr(-60,90);py+=Rr(-60,90);x.lineTo(px,py)}x.stroke()}
 for(let i=0;i<4000;i++){x.fillStyle=`rgba(${Math.random()<.5?'255,255,255':'120,110,95'},.08)`;x.fillRect(Rr(0,w),Rr(0,h),1.5,1.5)}},[1,1]);
T.plaster=ctex(512,512,(x,w,h)=>{x.fillStyle='#e9dcc0';x.fillRect(0,0,w,h);for(let i=0;i<22;i++){const px=Rr(0,w),py=Rr(0,h),r=Rr(60,160),g=x.createRadialGradient(px,py,0,px,py,r);const c=Math.random()<.5?'255,246,225':'200,180,140';g.addColorStop(0,`rgba(${c},.18)`);g.addColorStop(1,`rgba(${c},0)`);x.fillStyle=g;x.fillRect(px-r,py-r,2*r,2*r)}
 for(let i=0;i<6000;i++){const v=Math.random()<.5?255:150;x.fillStyle=`rgba(${v},${v-10},${v-35},.06)`;x.fillRect(Rr(0,w),Rr(0,h),1.5,1.5)}},[1,1]);
T.floor=ctex(512,512,(x,w,h)=>{for(let j=0;j<2;j++)for(let i=0;i<2;i++){const v=Rr(-8,8);x.fillStyle=`rgb(${230+v},${218+v},${190+v})`;x.fillRect(i*256,j*256,256,256);
  for(let k=0;k<1200;k++){x.fillStyle=`rgba(${Math.random()<.5?'255,250,235':'170,150,115'},.07)`;x.fillRect(i*256+Rr(0,256),j*256+Rr(0,256),Rr(1,5),Rr(1,3))}}
 x.strokeStyle='rgba(150,132,100,.55)';x.lineWidth=3;x.strokeRect(0,0,w,h);x.beginPath();x.moveTo(256,0);x.lineTo(256,h);x.moveTo(0,256);x.lineTo(w,256);x.stroke()},[1,1]);
T.fabric=ctex(256,256,(x,w,h)=>{x.fillStyle='#cfc7b8';x.fillRect(0,0,w,h);for(let i=0;i<w;i+=2){x.fillStyle='rgba(0,0,0,.07)';x.fillRect(i,0,1,h)}for(let j=0;j<h;j+=2){x.fillStyle='rgba(255,255,255,.06)';x.fillRect(0,j,w,1)}for(let i=0;i<5000;i++){x.fillStyle=`rgba(90,80,65,${Math.random()*.1})`;x.fillRect(Rr(0,w),Rr(0,h),1,1)}},[1,1]);
const stdM=(o)=>new THREE.MeshStandardMaterial(o);
const M={walnut:stdM({map:T.walnut,roughness:.5}),oak:stdM({map:T.oak,roughness:.6}),quartz:stdM({map:T.quartz,roughness:.22}),plaster:stdM({map:T.plaster,roughness:.95}),
 floor:stdM({map:T.floor,roughness:.3,metalness:0,color:0xffffff}),fabric:stdM({map:T.fabric,roughness:1}),brass:stdM({color:0xc9a24a,metalness:1,roughness:.3}),
 black:stdM({color:0x0c0c0e,metalness:.5,roughness:.25}),steel:stdM({color:0xb9bcc0,metalness:.9,roughness:.35}),
 glass:new THREE.MeshPhysicalMaterial({color:0xcfe8f5,transparent:true,opacity:.12,roughness:.02,metalness:0,clearcoat:1}),white:stdM({color:0xf1ede4,roughness:.9}),
 frame:stdM({color:0x4a4a46,metalness:.7,roughness:.4}),ceil:stdM({color:0xf1e9d6,roughness:1}),card:stdM({color:0xa87c4f,roughness:.95}),dark:stdM({color:0x2a2420,roughness:.8}),green:stdM({color:0x3f6a34,roughness:.9})};
M.walnutH=M.walnut;
// textured box in METRES (positions/sizes ×S); tm = metres per texture tile
function Bx(x0,x1,y0,y1,z0,z1,mat,o={}){const w=(x1-x0)*S,h=(y1-y0)*S,d=(z1-z0)*S,tm=(o.tm||1)*S;
 const g=new THREE.BoxGeometry(w,h,d),uv=g.attributes.uv,dims=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]],ox=o.rnd?Math.random():0,oy=o.rnd?Math.random():0;
 for(let f=0;f<6;f++)for(let k=0;k<4;k++){const i=f*4+k;let u=uv.getX(i)*dims[f][0]/tm+ox,v=uv.getY(i)*dims[f][1]/tm+oy;if(o.hgrain)uv.setXY(i,v,u);else uv.setXY(i,u,v)}
 const m=new THREE.Mesh(g,mat);m.position.set((x0+x1)/2*S,(y0+y1)/2*S,(z0+z1)/2*S);m.castShadow=o.cs!==false;m.receiveShadow=true;(o.parent||buildGroup).add(m);
 if(o.col!==false)addBoxCollider(x0*S,x1*S,z0*S,z1*S,y0*S,y1*S,null,{});return m}
function pieces(a0,a1,ops,fn){ops=[...ops].sort((p,q)=>p.a-q.a);let cur=a0;for(const op of ops){if(op.a>cur)fn(cur,op.a,0,WH);if(op.y0>0)fn(op.a,op.b,0,op.y0);if(op.y1<WH)fn(op.a,op.b,op.y1,WH);cur=op.b}if(cur<a1)fn(cur,a1,0,WH)}
function wallX(x,z0,z1,ops=[]){pieces(z0,z1,ops,(a,b,y0,y1)=>Bx(x-WT,x+WT,y0,y1,a,b,M.plaster,{tm:3}));
 for(const op of ops)if(op.glass){Bx(x-.02,x+.02,op.y0,op.y1,op.a,op.b,M.glass,{cs:false});for(const[ya,yb]of[[op.y0,op.y0+.04],[op.y1-.04,op.y1]])Bx(x-.04,x+.04,ya,yb,op.a,op.b,M.frame,{col:false});for(const za of[op.a,op.b-.04])Bx(x-.04,x+.04,op.y0,op.y1,za,za+.04,M.frame,{col:false});
  Bx(x-.12,x+.12,op.y0-.03,op.y0,op.a-.02,op.b+.02,M.quartz,{col:false})}}
function wallZ(z,x0,x1,ops=[]){pieces(x0,x1,ops,(a,b,y0,y1)=>Bx(a,b,y0,y1,z-WT,z+WT,M.plaster,{tm:3}));
 for(const op of ops)if(op.glass){Bx(op.a,op.b,op.y0,op.y1,z-.02,z+.02,M.glass,{cs:false});for(const[ya,yb]of[[op.y0,op.y0+.04],[op.y1-.04,op.y1]])Bx(op.a,op.b,ya,yb,z-.04,z+.04,M.frame,{col:false});for(const xa of[op.a,op.b-.04])Bx(xa,xa+.04,op.y0,op.y1,z-.04,z+.04,M.frame,{col:false});
  Bx(op.a-.02,op.b+.02,op.y0-.03,op.y0,z-.12,z+.12,M.quartz,{col:false})}}
const mesh=(geo,mat,x,y,z,par)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x*S,y*S,z*S);m.castShadow=true;m.receiveShadow=true;(par||buildGroup).add(m);return m};
const cyl=(r,h,mat,x,y,z,seg=16)=>mesh(new THREE.CylinderGeometry(r*S,r*S,h*S,seg),mat,x,y,z);
function pointLamp(x,y,z,col=0xffc477,inten=6,dist=28){const l=new THREE.PointLight(col,inten*30,dist*1,1.6);l.position.set(x*S,y*S,z*S);scene.add(l);return l}
function spot(x,y,z){const m=new THREE.Mesh(new THREE.CircleGeometry(.05*S,16),new THREE.MeshBasicMaterial({color:0xfff2d0}));m.rotation.x=Math.PI/2;m.position.set(x*S,(WH-.001)*S,z*S);scene.add(m)}

// ---- shell: walls (metres)
wallX(-20.1,-4.2,8.2);
wallZ(8.1,-20.2,3.2,[{a:-18,b:-14.5,y0:.3,y1:2.6,glass:1},{a:-13.5,b:-10,y0:.3,y1:2.6,glass:1}]);
wallX(3.1,-20.2,8.2,[{a:1,b:6,y0:1.1,y1:2.5,glass:1},{a:-9,b:-7,y0:.05,y1:2.5,glass:1},{a:-13,b:-12,y0:0,y1:2.3}]);
wallZ(-4.1,-20.2,.9);
wallX(-8.1,-4.2,8.2,[{a:3,b:6,y0:0,y1:2.4}]);
wallX(.9,-20.2,-4.1,[{a:-10,b:-8.9,y0:0,y1:2.2}]);
wallZ(-20.1,.8,3.2);
wallX(-12.1,-16.2,-4.2);wallZ(-16.1,-12.2,.9,[{a:-9,b:-4,y0:.3,y1:2.6,glass:1}]);
wallZ(-5.9,3.2,12.2);wallX(12.1,-19.2,-5.8,[{a:-17,b:-8,y0:.3,y1:2.6,glass:1}]);wallZ(-19.1,3.2,12.2,[{a:5,b:10,y0:.3,y1:2.6,glass:1}]);
// floors + ceilings
for(const r of ROOMS){const w=(r.x1-r.x0)*S,d=(r.z1-r.z0)*S,ft=T.floor.clone();ft.needsUpdate=true;ft.repeat.set((r.x1-r.x0)/1.6,(r.z1-r.z0)/1.6);
 const f=new THREE.Mesh(new THREE.PlaneGeometry(w,d).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({map:ft,roughness:.3}));f.position.set((r.x0+r.x1)/2*S,.02,(r.z0+r.z1)/2*S);f.receiveShadow=true;scene.add(f);
 Bx(r.x0-.2,r.x1+.2,WH,WH+.25,r.z0-.2,r.z1+.2,M.ceil,{col:false})}
// outside world seen through windows
{const g=new THREE.Mesh(new THREE.PlaneGeometry(9000,9000).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({color:0xcdbf9f,roughness:1}));g.position.y=-140;scene.add(g);
 const bm=new THREE.MeshStandardMaterial({color:0xe3d5b4,roughness:.9}),bm2=new THREE.MeshStandardMaterial({color:0xd0bf98,roughness:.9});
 for(let i=0;i<46;i++){const a=i/46*6.283+wr()*.1,r=wrand(520,1100),h=wrand(80,420),w=wrand(70,160);const b=new THREE.Mesh(new THREE.BoxGeometry(w,h+140,w*wrand(.8,1.6)),i%2?bm:bm2);
  b.position.set(-40+Math.cos(a)*r,-140+(h+140)/2,-60+Math.sin(a)*r);b.rotation.y=wr()*3;scene.add(b)}}
// ---- KITCHEN
for(let z=-4,i=0;z<2.2;z+=.6,i++){const zz=z+.005,z2=z+.595;
 if(i===5){Bx(-8,-7.35,0,.9,zz,z2,M.walnut,{rnd:1});Bx(-8,-7.32,.9,1.55,zz,z2,M.black);Bx(-7.34,-7.32,1.05,1.4,zz+.08,z2-.08,M.black,{col:false});Bx(-7.33,-7.3,1.46,1.49,zz+.08,z2-.08,M.steel,{col:false});Bx(-8,-7.35,1.55,2.7,zz,z2,M.walnut,{rnd:1})}
 else Bx(-8,-7.35,0,2.7,zz,z2,M.walnut,{rnd:1})}
Bx(-4.8,-1.8,0,.9,1.05,2.1,M.walnut,{rnd:1});Bx(-4.9,-1.7,.9,.95,.95,2.5,M.quartz,{tm:2});
Bx(-1.55,-1.15,.44,.48,1.5,1.9,M.oak);for(const[a,b]of[[-1.53,1.52],[-1.2,1.52],[-1.53,1.85],[-1.2,1.85]])Bx(a,a+.03,0,.44,b,b+.03,M.oak,{col:false});
Bx(-1.5,-1.2,.48,.52,1.55,1.85,M.white,{col:false});Bx(-1.49,-1.19,.52,.56,1.56,1.84,M.fabric,{col:false});Bx(-1.5,-1.2,.56,.6,1.55,1.85,M.white,{col:false});
{const c=document.createElement('canvas');c.width=512;c.height=360;const x=c.getContext('2d');x.fillStyle='#eef0ee';x.fillRect(0,0,512,360);x.fillStyle='#222';x.textAlign='center';x.font='24px Arial';x.fillText('CLIMATE DASHBOARD',256,56);
 x.font='20px Arial';x.fillText('LIVING ROOM:',130,150);x.fillText('KITCHEN:',390,150);x.font='54px Arial';x.fillText('23°C',130,230);x.fillText('22°C',390,230);x.strokeStyle='#999';x.lineWidth=2;x.beginPath();x.moveTo(256,120);x.lineTo(256,260);x.stroke();
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const grp=new THREE.Group();const body=new THREE.Mesh(new THREE.BoxGeometry(.27*S,.2*S,.012*S),M.black);grp.add(body);
 const scr=new THREE.Mesh(new THREE.PlaneGeometry(.245*S,.172*S),new THREE.MeshBasicMaterial({map:t}));scr.position.z=.0065*S;grp.add(scr);grp.position.set(-4.35*S,1.05*S,1.35*S);grp.rotation.x=-.22;grp.rotation.y=.1;grp.traverse(o=>o.castShadow=true);scene.add(grp)}
cyl(.038,.09,new THREE.MeshPhysicalMaterial({color:0xdff0f8,transparent:true,opacity:.3,roughness:0,clearcoat:1}),-3.85,.995,1.5);cyl(.034,.06,new THREE.MeshPhysicalMaterial({color:0xa9d4e8,transparent:true,opacity:.35,roughness:0}),-3.85,.98,1.5);
for(let z=.2,i=0;z<7.8;z+=.6,i++)Bx(2.4,3.0,0,.88,z+.005,z+.595,M.walnut,{rnd:1});
Bx(2.35,3.0,.88,.92,.2,7.9,M.quartz,{tm:2});Bx(2.94,3.0,.92,1.1,.2,7.9,M.quartz,{tm:2,col:false});Bx(2.5,2.9,.92,.925,3.6,4.6,M.steel,{col:false});cyl(.012,.25,M.steel,2.85,1.05,4.1,8);
Bx(2.25,3.0,0,2.1,-3.9,-3.1,M.steel);Bx(2.25,2.27,.2,1.9,-3.5,-3.45,M.black,{col:false});
// entrance door (walnut) + frame + smart lock
Bx(-4.5,-3.5,0,2.2,-4,-3.95,M.walnut,{col:false});Bx(-4.62,-4.5,0,2.3,-4,-3.92,M.walnut,{col:false});Bx(-3.5,-3.38,0,2.3,-4,-3.92,M.walnut,{col:false});Bx(-4.62,-3.38,2.2,2.3,-4,-3.92,M.walnut,{col:false});
Bx(-3.66,-3.59,1.0,1.2,-3.95,-3.92,M.black,{col:false});Bx(-3.7,-3.52,.9,.93,-3.95,-3.88,M.black,{col:false});cyl(.018,.03,M.black,-3.62,.82,-3.93,10).rotation.x=Math.PI/2;
Bx(-3.0,-2.94,1.2,1.32,-4,-3.98,M.brass,{col:false});
for(const[x,z]of[[-5.5,.5],[-2.5,.5],[-3,3.5],[-5.5,3.5],[-1,6],[-6,6]])spot(x,z);
pointLamp(-3.5,2.6,2,0xffe3b8,7,95);pointLamp(.5,2.6,5,0xffe3b8,5,80);
// ---- HALLWAY
for(const z of[-7,-12.5,-18]){cyl(.035,.22,M.brass,1.06,1.65,z,14);pointLamp(1.45,1.7,z,0xffbf6a,5,34)}
for(const z of[-6.5,-15]){cyl(.035,.22,M.brass,2.94,1.65,z,14);pointLamp(2.55,1.7,z,0xffbf6a,5,34)}
Bx(1.95,2.05,WH-.03,WH,-19.8,-4.3,M.black,{col:false});for(const z of[-6,-10,-14,-18])for(const x of[1.5,2.5])spot(x,z);
Bx(1.2,2.8,0,2.2,-20.0,-19.95,M.oak,{col:false});Bx(1.12,1.2,0,2.3,-20.0,-19.93,M.oak,{col:false});Bx(2.8,2.88,0,2.3,-20.0,-19.93,M.oak,{col:false});Bx(1.12,2.88,2.2,2.3,-20.0,-19.93,M.oak,{col:false});Bx(2.55,2.7,1.0,1.03,-19.95,-19.88,M.steel,{col:false});
// ---- LIVING ROOM
const rugM=stdM({map:T.fabric,color:0xb9a98d,roughness:1}),sofaM=stdM({map:T.fabric,color:0x8d887a,roughness:1});
Bx(-18,-12,0,.02,-1,5.5,rugM,{col:false,tm:1.5});
Bx(-17.5,-14,.12,.45,5.3,6.6,sofaM,{tm:.7});Bx(-17.5,-14,.45,.95,6.6,7,sofaM,{tm:.7});Bx(-17.9,-17.5,.12,.65,3.4,7,sofaM,{tm:.7});Bx(-17.5,-16.2,.12,.45,3.4,5.3,sofaM,{tm:.7});
Bx(-16.6,-14.6,.34,.39,1.6,3.0,M.oak,{tm:1});for(const[x,z]of[[-16.55,1.65],[-14.7,1.65],[-16.55,2.9],[-14.7,2.9]])Bx(x,x+.05,0,.34,z,z+.05,M.oak,{col:false});
Bx(-19.9,-19.4,0,.5,0,3.4,M.walnut,{rnd:1});Bx(-19.92,-19.85,.62,1.4,.5,3.0,M.black,{col:false});
Bx(-19.9,-19.5,0,2.4,4.6,7.4,M.walnut,{rnd:1});for(let k=0;k<30;k++){const y=.15+Math.floor(k/6)*.45,z=4.7+(k%6)*.45;Bx(-19.5,-19.46,y,y+Rr(.2,.34),z,z+Rr(.05,.1),stdM({color:new THREE.Color().setHSL(rr_(),.3,.4),roughness:.8}),{col:false})}
cyl(.2,.03,M.dark,-11,.02,5.5,20);cyl(.015,1.5,M.brass,-11,.78,5.5,8);cyl(.16,.28,stdM({color:0xfff0cf,emissive:0xffdd99,emissiveIntensity:.8}),-11,1.62,5.5,16);pointLamp(-11,1.6,5.5,0xffd699,7,70);
cyl(.2,.4,stdM({color:0xe9e2d2,roughness:.8}),-9,.2,7.4,16);mesh(new THREE.SphereGeometry(.45*S,14,10),M.green,-9,.95,7.4).scale.set(1,1.2,1);
pointLamp(-14,2.5,2,0xffe8c4,7,100);spot(-14,2);spot(-17,5);spot(-11,1);
// ---- SUITE
Bx(-9.5,-7.3,0,.3,-7.2,-4.3,M.walnut,{rnd:1});Bx(-9.45,-7.35,.3,.58,-7.1,-4.35,M.white,{tm:1});Bx(-9.6,-7.2,.3,1.15,-4.35,-4.3,M.walnut,{rnd:1});
for(const x of[-9.25,-8.2])Bx(x,x+.7,.58,.68,-5.2,-4.4,M.white,{col:false});Bx(-9.45,-7.35,.58,.62,-6.8,-5.5,M.fabric,{col:false});
for(const x of[-10.3,-7.1])Bx(x,x+.5,0,.5,-4.8,-4.3,M.walnut,{rnd:1});
for(let z=-14,i=0;z<-9;z+=.6,i++)Bx(-12,-11.35,0,2.6,z+.005,z+.595,M.walnut,{rnd:1});
Bx(-10.5,-6,0,.02,-10.5,-6.5,rugM,{col:false,tm:1.5});pointLamp(-6,2.5,-9,0xffe8c4,6,90);spot(-8,-8);spot(-8,-12);
// ---- STUDY
Bx(5,8.2,.7,.74,-18,-17,M.oak,{tm:1.2,hgrain:1});for(const[x,z]of[[5.05,-17.95],[8.1,-17.95],[5.05,-17.1],[8.1,-17.1]])Bx(x,x+.05,0,.7,z,z+.05,M.dark,{col:false});
Bx(6.2,6.7,.45,.5,-16.5,-16,M.fabric);Bx(6.2,6.7,.5,1.0,-16.5,-16.45,M.fabric,{col:false});cyl(.03,.45,M.dark,6.45,.22,-16.25,8);
Bx(4,9.5,0,2.2,-6.5,-6.0,M.walnut,{rnd:1});for(let k=0;k<44;k++){const y=.12+Math.floor(k/11)*.5,x=4.2+(k%11)*.48;Bx(x,x+Rr(.05,.12),y,y+Rr(.25,.38),-6.45,-6.1,stdM({color:new THREE.Color().setHSL(rr_(),.3,.4),roughness:.8}),{col:false})}
cyl(.2,.4,stdM({color:0xe9e2d2,roughness:.8}),11.2,.2,-7,16);mesh(new THREE.SphereGeometry(.5*S,14,10),M.green,11.2,1,-7).scale.set(1,1.3,1);
pointLamp(7.5,2.5,-12.5,0xffe8c4,7,110);spot(6,-10);spot(9,-14);
// sun streaming through the east window (golden hour)


// ---- gameplay glue: spawn points, crates to smash for materials, chests, toy cars
const rtmp=new THREE.Vector3();
function floorSpot(){for(let t=0;t<40;t++){let tot=0;for(const r of ROOMS)tot+=(r.x1-r.x0)*(r.z1-r.z0);let a=Math.random()*tot,rm=ROOMS[0];for(const r of ROOMS){const ar=(r.x1-r.x0)*(r.z1-r.z0);if(a<ar){rm=r;break}a-=ar}
  const x=rand(rm.x0+1.3,rm.x1-1.3)*S,z=rand(rm.z0+1.3,rm.z1-1.3)*S;rtmp.set(x,0,z);if(!resolve(rtmp,5,22)&&Math.abs(rtmp.x-x)<.01)return[x,z,0]}return[-40,-30,0]}
for(const r of ROOMS)POIS.push({name:r.n,x:(r.x0+r.x1)/2*S,z:(r.z0+r.z1)/2*S});
const landSpot=()=>floorSpot();const nearCabin=()=>false;
for(let i=0;i<14;i++){const[x,z]=floorSpot();addChest(x,0,z)}
for(let i=0;i<48;i++){const[x,z]=floorSpot(),s=rand(2.6,3.8),m=new THREE.Mesh(new THREE.BoxGeometry(s,s*.85,s),M.card);m.position.set(x,s*.425,z);m.rotation.y=Math.random()*3;m.castShadow=m.receiveShadow=true;scene.add(m);
 const tape=new THREE.Mesh(new THREE.BoxGeometry(s*.12,.05,s*1.01),stdM({color:0xd9c7a0,roughness:.6}));tape.position.y=s*.43;m.add(tape);
 const rec={x,z,y:0,r:s*.75,h:s,hp:3,kind:'crate',sets:[],mesh:m,dead:false};trees.push(rec);gAdd(rgrid,rec,x-s,x+s,z-s,z+s)}
function fellTree(rec){rec.dead=true;if(rec.mesh&&rec.mesh.parent)rec.mesh.parent.remove(rec.mesh)}

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
for(let i=0;i<95;i++){const sp=floorSpot();randomLoot(sp[0],0.2,sp[1])}
for(const[x,y,z]of[[-3.4,.97,1.7],[-2.5,.97,1.5],[2.7,.94,2.5],[2.7,.94,5.5],[-3.4,.97,2.1]])randomLoot(x*S,y*S,z*S)

// ---------- characters
const SKINS=[
 {name:'Ranger',shirt:0x55603a,pants:0x3d4430,vest:0x2b3322,hat:'cap',hatC:0x3a4528,skin:0xd8a77c},
 {name:'Ghillie',shirt:0x4a5a2a,pants:0x4a5a2a,vest:0x3a4a20,hat:'hood',hatC:0x44562a,skin:0xc89870,ghillie:true},
 {name:'Arctic',shirt:0xe9eef0,pants:0xcfd8dc,vest:0x9fb2bb,hat:'beanie',hatC:0xdde6ea,skin:0xe6bd9b},
 {name:'Desert',shirt:0xb89a68,pants:0x9c8156,vest:0x6e5a3a,hat:'helmet',hatC:0x8a7348,skin:0x9a6b45},
 {name:'Hiker',shirt:0xc2402e,pants:0x2f3b4f,vest:0x1f6e8c,hat:'beanie',hatC:0xf0b429,skin:0xf0c9a5},
 {name:'Shadow',shirt:0x1d1f24,pants:0x16181c,vest:0x2a2d34,hat:'helmet',hatC:0x101114,skin:0x6b4a35}];
const lam=c=>new THREE.MeshStandardMaterial({color:c,roughness:.85});

const fabricTex=ctex(128,128,(x,w,h)=>{x.fillStyle='#e6e6e6';x.fillRect(0,0,w,h);for(let i=0;i<4000;i++){const v=170+Math.random()*80|0;x.fillStyle=`rgb(${v},${v},${v})`;x.fillRect(Math.random()*w,Math.random()*h,1,1)}
 for(let i=0;i<w;i+=2){x.fillStyle='rgba(0,0,0,.09)';x.fillRect(i,0,1,h)}for(let j=0;j<h;j+=2){x.fillStyle='rgba(0,0,0,.06)';x.fillRect(0,j,w,1)}},[2,2]);
const fab=c=>new THREE.MeshStandardMaterial({color:c,map:fabricTex,roughness:.92});
function faceTex(skinHex,hairHex,beard){const hex=n=>'#'+n.toString(16).padStart(6,'0');
 return ctex(512,256,(x,w,h)=>{x.fillStyle=hex(skinHex);x.fillRect(0,0,w,h);
  for(let i=0;i<2500;i++){x.fillStyle=`rgba(${Math.random()<.5?'255,200,170':'120,70,50'},.05)`;x.fillRect(Math.random()*w,Math.random()*h,2,2)}
  const cx=w*.75,cy=h*.5;
  x.fillStyle='rgba(200,110,100,.16)';for(const s of[-1,1]){x.beginPath();x.ellipse(cx+s*34,cy+22,16,10,0,0,7);x.fill()}
  for(const s of[-1,1]){x.fillStyle='#f2efe9';x.beginPath();x.ellipse(cx+s*21,cy-6,10,5.5,0,0,7);x.fill();
   x.fillStyle='#4a3524';x.beginPath();x.arc(cx+s*21,cy-6,4.4,0,7);x.fill();x.fillStyle='#0a0a0a';x.beginPath();x.arc(cx+s*21,cy-6,2.1,0,7);x.fill();x.fillStyle='#fff';x.fillRect(cx+s*21-2,cy-8,1.6,1.6);
   x.strokeStyle='rgba(60,35,25,.7)';x.lineWidth=1.3;x.beginPath();x.ellipse(cx+s*21,cy-6,10,5.5,0,Math.PI,0);x.stroke();
   x.strokeStyle=hex(hairHex);x.lineWidth=4;x.beginPath();x.moveTo(cx+s*10,cy-19+(s>0?0:0));x.quadraticCurveTo(cx+s*22,cy-26,cx+s*34,cy-18);x.stroke()}
  x.strokeStyle='rgba(90,50,40,.35)';x.lineWidth=2;x.beginPath();x.moveTo(cx,cy-4);x.lineTo(cx-2,cy+14);x.lineTo(cx+4,cy+16);x.stroke();
  x.strokeStyle='rgba(110,50,50,.85)';x.lineWidth=3;x.beginPath();x.moveTo(cx-14,cy+34);x.quadraticCurveTo(cx,cy+39,cx+14,cy+34);x.stroke();
  x.fillStyle='rgba(150,70,70,.55)';x.beginPath();x.ellipse(cx,cy+37,10,3,0,0,7);x.fill();
  if(beard){x.fillStyle=hex(hairHex);x.globalAlpha=.35;for(let i=0;i<900;i++){const a=Math.random()*6.28,r=Math.random();const px=cx+Math.cos(a)*r*52,py=cy+30+Math.abs(Math.sin(a))*r*38;x.fillRect(px,py,1.3,2)}x.globalAlpha=1}
 },[1,1])}
function limb(r0,r1,len,mat){const g=new THREE.CylinderGeometry(r0,r1,len,12);g.translate(0,-len/2,0);const m=new THREE.Mesh(g,mat);m.castShadow=true;return m}
function ball(r,mat,sx=1,sy=1,sz=1){const m=new THREE.Mesh(new THREE.SphereGeometry(r,14,10),mat);m.scale.set(sx,sy,sz);m.castShadow=true;return m}
function makeChar(sk,name){
 const g=new THREE.Group(),P={};
 const tones=[0xf0c8a4,0xe0a981,0xc68642,0x8d5524,0x6b4228,0xffdbb4];const skinC=sk.skin;
 const skinM=new THREE.MeshStandardMaterial({color:skinC,roughness:.65}),shirt=fab(sk.shirt),pants=fab(sk.pants),vestM=fab(sk.vest);
 const bootM=new THREE.MeshStandardMaterial({color:0x1c1a18,roughness:.6}),hairC=pick([0x2a1c12,0x4a3320,0x1c1c1c,0x8a6a3a,0x6b3b1e]);
 // ---- legs: hip -> knee -> ankle
 for(const s of[-1,1]){const hip=new THREE.Group();hip.position.set(s*.095,.93,0);
  const th=limb(.088,.064,.46,pants);hip.add(th);const kn=new THREE.Group();kn.position.y=-.46;hip.add(kn);
  const kb=ball(.066,pants);kn.add(kb);const ca=limb(.064,.046,.44,pants);kn.add(ca);
  const boot=new THREE.Mesh(new THREE.CapsuleGeometry(.05,.17,4,8),bootM);boot.rotation.x=Math.PI/2;boot.scale.set(1.1,1,1.15);boot.position.set(0,-.46,-.05);boot.castShadow=true;kn.add(boot);
  const shaft=limb(.058,.052,.17,bootM);shaft.position.y=-.31;kn.add(shaft);
  g.add(hip);P[s<0?'legL':'legR']=hip;P[s<0?'kneeL':'kneeR']=kn}
 // ---- pelvis + torso
 const pel=ball(.165,pants,1,.75,.7);pel.position.y=.95;g.add(pel);
 const belt=new THREE.Mesh(new THREE.CylinderGeometry(.168,.168,.045,16),new THREE.MeshStandardMaterial({color:0x2a2018,roughness:.5}));belt.scale.z=.7;belt.position.y=1.02;g.add(belt);
 const prof=[[.15,0],[.158,.06],[.168,.16],[.19,.27],[.205,.36],[.2,.45],[.15,.53],[.062,.585]].map(([r,y])=>new THREE.Vector2(r,y));
 const tor=new THREE.Mesh(new THREE.LatheGeometry(prof,20),shirt);tor.scale.z=.62;tor.position.y=1.0;tor.castShadow=true;g.add(tor);
 const vs=new THREE.Mesh(new THREE.LatheGeometry(prof.slice(2,6).map(p=>new THREE.Vector2(p.x+.012,p.y)),20,.4,Math.PI*2-.8),vestM);vs.scale.z=.66;vs.position.y=1.0;vs.rotation.y=Math.PI;vs.castShadow=true;g.add(vs);
 for(const s of[-1,1]){const pk=new THREE.Mesh(boxGeo,vestM);pk.scale.set(.07,.09,.04);pk.position.set(s*.075,1.2,-.14);g.add(pk)}
 const pack=new THREE.Mesh(new THREE.CapsuleGeometry(.1,.2,4,8),vestM);pack.scale.set(1.35,1,.7);pack.position.set(0,1.28,.16);pack.castShadow=true;g.add(pack);
 for(const s of[-1,1]){const sh=ball(.07,shirt);sh.position.set(s*.215,1.49,0);g.add(sh)}
 const neck=limb(.052,.058,.09,skinM);neck.position.y=1.65;g.add(neck);
 const col=new THREE.Mesh(new THREE.TorusGeometry(.06,.018,6,14),shirt);col.rotation.x=Math.PI/2;col.position.y=1.585;g.add(col);
 // ---- head
 const hg=new THREE.Group();hg.position.y=1.7;g.add(hg);
 const hm=new THREE.MeshStandardMaterial({color:0xffffff,map:faceTex(skinC,hairC,Math.random()<.4),roughness:.6});
 const head=new THREE.Mesh(new THREE.SphereGeometry(.1,28,20),[hm][0]);head.scale.set(.88,1.18,1.02);head.castShadow=true;hg.add(head);P.head=head;
 const jaw=ball(.075,skinM,1,.8,.95);jaw.position.set(0,-.07,-.015);hg.add(jaw);
 const nose=new THREE.Mesh(new THREE.ConeGeometry(.016,.045,8),skinM);nose.rotation.x=-Math.PI/2;nose.position.set(0,-.012,-.103);hg.add(nose);
 for(const s of[-1,1]){const ear=ball(.022,skinM,.5,1.2,1);ear.position.set(s*.088,-.005,.008);hg.add(ear)}
 const hairM=new THREE.MeshStandardMaterial({color:hairC,roughness:.9});
 if(sk.hat==='none'||sk.hat==='cap'||sk.hat==='hood'){const hair=new THREE.Mesh(new THREE.SphereGeometry(.106,24,14,0,6.283,0,1.75),hairM);hair.scale.set(.93,1.2,1.1);hair.position.set(0,.004,.012);hair.rotation.x=.12;hg.add(hair)}
 const hmat=fab(sk.hatC);
 if(sk.hat==='helmet'){const h=new THREE.Mesh(new THREE.SphereGeometry(.118,24,14,0,6.283,0,1.55),new THREE.MeshStandardMaterial({color:sk.hatC,roughness:.5,metalness:.1}));h.scale.set(.96,1.15,1.12);h.position.y=.025;h.castShadow=true;hg.add(h);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.108,.012,6,20),new THREE.MeshStandardMaterial({color:0x222222}));rim.rotation.x=Math.PI/2;rim.scale.set(.96,1.1,1);rim.position.y=.025;hg.add(rim)}
 else if(sk.hat==='cap'){const h=new THREE.Mesh(new THREE.SphereGeometry(.112,20,12,0,6.283,0,1.4),hmat);h.scale.set(.94,1.15,1.08);h.position.y=.03;hg.add(h);const br=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.01,16,1,false,-1.5,3),hmat);br.scale.set(1,1,1.2);br.position.set(0,.03,-.11);br.rotation.x=.18;hg.add(br)}
 else if(sk.hat==='beanie'){const h=new THREE.Mesh(new THREE.SphereGeometry(.112,20,12,0,6.283,0,1.62),hmat);h.scale.set(.96,1.18,1.1);h.position.y=.02;hg.add(h);const pm=ball(.03,hmat);pm.position.y=.14;hg.add(pm)}
 else if(sk.hat==='hood'){const h=new THREE.Mesh(new THREE.SphereGeometry(.128,22,14,0,6.283,0,2.2),hmat);h.scale.set(.95,1.18,1.12);h.position.set(0,-.005,.02);hg.add(h)}
 const gog=new THREE.Mesh(new THREE.TorusGeometry(.088,.012,6,18,Math.PI*1.1),new THREE.MeshStandardMaterial({color:0x111111}));gog.scale.set(.92,.35,1);gog.position.set(0,.025,-.02);gog.rotation.x=0;gog.visible=false;hg.add(gog)
 // ---- arms: shoulder -> elbow -> hand
 for(const s of[-1,1]){const sh=new THREE.Group();sh.position.set(s*.215,1.49,0);
  const ua=limb(.058,.048,.3,shirt);sh.add(ua);const el=new THREE.Group();el.position.y=-.3;sh.add(el);
  el.add(ball(.049,shirt));const fa=limb(.048,.038,.27,shirt);el.add(fa);
  const cuff=limb(.042,.04,.04,shirt);cuff.position.y=-.24;el.add(cuff);
  const hand=ball(.04,skinM,.95,1.5,.6);hand.position.y=-.31;el.add(hand);
  const th=ball(.014,skinM,1,2,1);th.position.set(s*-.03,-.28,-.02);el.add(th);
  g.add(sh);P[s<0?'armL':'armR']=sh;P[s<0?'elbL':'elbR']=el;if(s>0)P.hand=el}
 if(sk.ghillie){const lm=new THREE.MeshStandardMaterial({color:0x56742e,roughness:1,side:THREE.DoubleSide}),lm2=new THREE.MeshStandardMaterial({color:0x6e6034,roughness:1,side:THREE.DoubleSide});
  for(let i=0;i<110;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(.05,rand(.16,.3)),i%3?lm:lm2);m.position.set(rand(-.26,.26),rand(.55,1.75),rand(-.2,.24));m.rotation.set(rand(-.9,.9),rand(0,6),rand(-.9,.9));g.add(m)}}
 const gunSlot=new THREE.Group();gunSlot.position.set(0,-.29,0);gunSlot.rotation.x=-Math.PI/2;P.elbR.add(gunSlot);P.gunSlot=gunSlot;
 g.traverse(o=>{if(o.isMesh)o.castShadow=true});
 if(name){const c=document.createElement('canvas');c.width=256;c.height=48;const x=c.getContext('2d');x.font='bold 28px Segoe UI,Arial';x.textAlign='center';x.fillStyle='rgba(0,0,0,.45)';x.fillRect(0,0,256,48);x.fillStyle='#fff';x.fillText(name,128,34);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthTest:false,transparent:true}));sp.scale.set(1.3,.24,1);sp.position.y=2.15;sp.renderOrder=5;g.add(sp);P.tag=sp}
 g.userData.P=P;return g}
function setGun(model,k){const P=model.userData.P;while(P.gunSlot.children.length)P.gunSlot.remove(P.gunSlot.children[0]);P.armed=!!k;
 if(k){const gm=makeGunMesh(k,1.1);gm.rotation.x=Math.PI/2*0;P.gunSlot.add(gm)}}
function pickaxeMesh(){const g=new THREE.Group();const h=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.75,6),lam(0x6b4a2a));h.rotation.x=Math.PI/2;g.add(h);
 const head=new THREE.Mesh(boxGeo,new THREE.MeshStandardMaterial({color:0x9aa3aa,metalness:.8,roughness:.3}));head.scale.set(.5,.05,.06);head.position.z=-.36;g.add(head);return g}
function animChar(model,speed,t,state,aim,swing){const P=model.userData.P,sw=Math.min(speed,10),f=sw>.4?Math.sin(t*sw*1.2):0,a=f*Math.min(.75,sw*.1),run=Math.min(1,sw/9);
 const set=(o,x,y=0,z=0)=>o.rotation.set(x,y,z);
 if(state==='fall'){model.rotation.x=-1.35;set(P.legL,.2);set(P.legR,-.15);set(P.kneeL,-.3);set(P.kneeR,-.1);set(P.armL,.2,0,1.3);set(P.armR,.2,0,-1.3);set(P.elbL,.3);set(P.elbR,.3);return}
 if(state==='glide'){model.rotation.x=0;set(P.legL,.3);set(P.legR,-.1);set(P.kneeL,-.4);set(P.kneeR,-.2);set(P.armL,0,0,2.7);set(P.armR,0,0,-2.7);set(P.elbL,0);set(P.elbR,0);return}
 model.rotation.x=0;
 set(P.legL,a*1.15);set(P.legR,-a*1.15);
 set(P.kneeL,-(Math.max(0,-a)*1.5+.04+run*.15));set(P.kneeR,-(Math.max(0,a)*1.5+.04+run*.15));
 if(P.armed){set(P.armR,1.38,0,-.18);set(P.elbR,.12);set(P.armL,1.22,0,.5);set(P.elbL,.55)}
 else{const sv=swing>0?2.6-swing*2.4:null;
  set(P.armL,-a*.9,0,.05);set(P.elbL,.25+run*.5);
  if(sv!==null){set(P.armR,sv,0,-.1);set(P.elbR,.4)}else{set(P.armR,a*.9,0,-.05);set(P.elbR,.25+run*.5)}}
 }
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
for(let i=0;i<9;i++){const sp=floorSpot();spawnCar(sp[0],sp[1],wr()*6.28,pick(['jeep','sport','pickup']))}
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
 bus.scale.setScalar(.8);bus.visible=false;scene.add(bus)}
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
const PH=[{wait:60,shrink:40,r:170,dmg:1.2},{wait:35,shrink:30,r:110,dmg:2.5},{wait:30,shrink:26,r:60,dmg:5},{wait:25,shrink:20,r:28,dmg:9},{wait:15,shrink:14,r:3,dmg:14}];
const storm={cx:0,cz:0,r:R*1.2,fromR:R*1.2,fromX:0,fromZ:0,toX:0,toZ:0,toR:R*1.2,phase:-1,t:0,state:'wait',dur:50,dmg:0};
{ // initial phase 0 wait; target for phase 0
 const pick0=()=>{const a=Math.random()*6.28,d=Math.random()*60;return[Math.cos(a)*d,Math.sin(a)*d]};
 const [x,z]=pick0();Object.assign(storm,{cx:-40,cz:-60,phase:0,t:0,state:'wait',dur:PH[0].wait,fromR:260,r:260,toR:PH[0].r,toX:-40+x*.6,toZ:-60+z*.6,fromX:-40,fromZ:-60,dmg:PH[0].dmg})}
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
  const wk=pick(WKEYS),b={isPlayer:false,name,pos:new THREE.Vector3(),vy:0,hv:new THREE.Vector3(),yaw:Math.random()*6.28,hp:100,shield:Math.random()<.4?50:0,alive:true,kills:0,state:'ground',landedT:-2,model,
   wep:newWeapon(wk,rollRarity()),dropT:rand(1.5,G.busLen*.85),target:null,tgtChar:null,fireT:rand(.5,1.5),relT:0,losT:0,seeing:false,stuck:0,wanderT:0,speed:0,glider:null,strafe:Math.random()<.5?1:-1,strT:0,landedT:0};
  {const sp=floorSpot();b.pos.set(sp[0],0,sp[1]);model.visible=true;model.position.copy(b.pos)}setGun(model,b.wep.key);chars.push(b);bots.push(b)}}
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
const MM={x0:-21*S,z0:-21*S,sz:34*S};
{const x=mmBase.getContext('2d');x.fillStyle='#1c1814';x.fillRect(0,0,180,180);const k=180/MM.sz;
 for(const r of ROOMS){x.fillStyle=r.n==='Hallway'?'#cdbf9f':'#e3d6b8';x.fillRect((r.x0*S-MM.x0)*k,(r.z0*S-MM.z0)*k,(r.x1-r.x0)*S*k,(r.z1-r.z0)*S*k)}
 x.strokeStyle='#5a4a35';x.lineWidth=1.2;for(const r of ROOMS)x.strokeRect((r.x0*S-MM.x0)*k,(r.z0*S-MM.z0)*k,(r.x1-r.x0)*S*k,(r.z1-r.z0)*S*k)}
const w2m=(x,z)=>[(x-MM.x0)/MM.sz*180,(z-MM.z0)/MM.sz*180];
function drawMinimap(){mc.clearRect(0,0,180,180);mc.drawImage(mmBase,0,0);
 // storm
 mc.save();mc.fillStyle='rgba(140,60,255,.35)';mc.beginPath();mc.rect(0,0,180,180);const[sx,sz]=w2m(storm.cx,storm.cz),sr=storm.r/MM.sz*180;mc.arc(sx,sz,sr,0,6.28,true);mc.fill('evenodd');mc.restore();
 mc.strokeStyle='#fff';mc.lineWidth=1.5;mc.beginPath();const[tx,tz]=w2m(storm.toX,storm.toZ);mc.arc(tx,tz,storm.toR/MM.sz*180,0,6.28);mc.stroke();
 mc.font='bold 7px sans-serif';mc.fillStyle='#fff';mc.textAlign='center';for(const p of POIS){const[x,z]=w2m(p.x,p.z);mc.fillText(p.name,x,z)}
 mc.fillStyle='#ff9f1c';for(const v of vehicles){if(v.dead)continue;const[x,z]=w2m(v.x,v.z);mc.fillRect(x-1.5,z-1.5,3,3)}
 
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
 {const sp=floorSpot();P.pos.set(sp[0],0,sp[1]);P.state='ground';P.onGround=true;P.model.visible=true;P.yaw=0;camYaw=0;camPitch=-.15;P.fallT=0;refreshHeld();}
 hudSlots();banner('You have been SHRUNK to 18 cm — survive the apartment!',5000);
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
window.__wf={setCam:(y,p)=>{camYaw=y;camPitch=p},P,G,chars,storm,startGame,vehicles,items,chests,refreshHeld,hudSlots,giveItem,newWeapon,enterCar,keys};
