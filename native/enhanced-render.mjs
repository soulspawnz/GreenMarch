import {Renderer} from './render.mjs';

const image=path=>{const img=new Image();img.src=new URL(path,import.meta.url);return img};
const backdrop=image('./assets/enhanced/woodland.svg');
const makeCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
const oval=(c,x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill()};
function line(c,x,y,x2,y2,color,width=3){c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke()}

// Presentation only: the original terrain and simulation remain authoritative.
export class EnhancedRenderer extends Renderer {
 constructor(canvas,level,frames){
  super(canvas,level,frames);canvas.width=1280;canvas.height=level.height*4;
  this.surface=makeCanvas(level.width*8,level.height*4);this.surfaceContext=this.surface.getContext('2d');
  this.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
 }
 terrain(game){
  super.terrain(game);
  const w=this.pixelCanvas.width,h=this.level.height,im=this.pixelContext.getImageData(0,0,w,h),p=im.data;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const i=(y*w+x)*4,r=p[i],g=p[i+1],b=p[i+2];
   if(r+g+b===0){p[i+3]=0;continue}
   const above=y>0?(y*w+x-w)*4:-1,edge=above<0||p[above+3]===0;
   const grain=((x*73+y*151+x*y*3)%23)-11,light=edge?40:0;
   p[i]=Math.min(255,r*1.15+grain+light+12);p[i+1]=Math.min(255,g*1.2+grain+light+15);p[i+2]=Math.min(255,b*1.25+grain+light+16);
  }
  this.pixelContext.putImageData(im,0,0);const c=this.surfaceContext;c.clearRect(0,0,this.surface.width,this.surface.height);c.imageSmoothingEnabled=false;c.drawImage(this.pixelCanvas,0,0,this.surface.width,this.surface.height);
  // Fine mineral flecks are clipped to existing visible terrain.
  c.save();c.globalCompositeOperation='source-atop';
  for(let y=2;y<this.surface.height;y+=11)for(let x=(y*7)%17;x<this.surface.width;x+=19){c.fillStyle=(x+y)%3?'#ffffff12':'#08182222';c.fillRect(x,y,3,1)}c.restore();
 }
 actor(c,a){
  const phase=a.phase,work=['dig','mine','bash','build'].includes(a.state),swing=Math.sin(phase*Math.PI/4),bob=a.state==='walk'?Math.abs(swing)*.55:0;
  c.save();c.translate((a.x-this.camera)*8,a.y*4);c.scale(a.dir,1);
  if(a.state==='exit')c.globalAlpha=Math.max(0,1-phase/8);
  if(['splat','drown','explode'].includes(a.state)){
   c.globalAlpha=Math.max(0,1-phase/16);
   for(let i=0;i<8;i++){const angle=i*Math.PI/4;oval(c,Math.cos(angle)*phase*2,Math.sin(angle)*phase-14,3,2,a.state==='explode'?'#ffc66c':'#a8e2be')}c.restore();return;
  }
  c.translate(-3,-bob);oval(c,0,-1,14,2,'#071b2266');
  const stride=a.state==='walk'?swing*5:work?swing*1.5:2;
  line(c,-4,-12,-5-stride,-3,'#243849',5);line(c,3,-12,4+stride,-3,'#243849',5);
  line(c,-6-stride,-2,-1-stride,-2,'#e2e3c4',3);line(c,3+stride,-2,9+stride,-2,'#e2e3c4',3);
  const shirt=c.createLinearGradient(-8,-27,8,-12);shirt.addColorStop(0,'#6495e2');shirt.addColorStop(1,'#2c5095');
  c.fillStyle=shirt;c.beginPath();c.roundRect(-8,-27,15,16,4);c.fill();line(c,-5,-24,4,-24,'#a6c6fb',1.4);
  let handX=9,handY=-18+swing*3;
  if(a.state==='block'){handX=15;handY=-24}
  else if(['climb','hoist','float','fall'].includes(a.state)){handX=9;handY=-35+swing*2}
  else if(work){handX=11+swing*3;handY=(a.state==='dig'?-10:-21)+swing*6}
  line(c,-6,-25,-handX,handY,'#85ace8',4);line(c,6,-25,handX,handY,'#85ace8',4);oval(c,handX,handY,3,3,'#f3d6b2');oval(c,-handX,handY,3,3,'#f3d6b2');
  oval(c,0,-33,9,9,'#e9c49e');oval(c,6,-32,4,3,'#f6ddba');
  c.fillStyle='#8be17c';c.beginPath();c.moveTo(-9,-31);c.lineTo(-12,-42);c.lineTo(-5,-39);c.lineTo(-6,-46);c.lineTo(1,-41);c.lineTo(6,-45);c.lineTo(11,-37);c.lineTo(6,-36);c.quadraticCurveTo(-2,-42,-9,-31);c.fill();
  oval(c,5,-35,2.3,3,'#fff9e5');oval(c,6,-35,1,1.6,'#183039');
  if(a.state==='block'){oval(c,handX,handY,4,4,'#f3d6b2');line(c,handX,-27,handX,-21,'#fff2d6',1)}
  if(['dig','mine','bash'].includes(a.state)){line(c,handX-4,handY-7,handX+5,handY+5,'#c89c59',3);line(c,handX-8,handY-7,handX+3,handY-10,'#c0d6da',3)}
  if(a.state==='build'){c.fillStyle='#e7bc73';c.fillRect(handX-5,handY-4,12,5);line(c,handX-5,handY-4,handX+7,handY-4,'#fff1b2',1)}
  if(a.state==='float'){
   line(c,0,-36,0,-64,'#e9d7b1',1.5);c.fillStyle='#d8b36b';c.beginPath();c.arc(0,-63,20,Math.PI,0);c.lineTo(-20,-63);c.fill();line(c,-20,-63,20,-63,'#fff0b8',2);
  }
  if(a.bomb>0){c.fillStyle='#fff3c2';c.font='bold 20px sans-serif';c.textAlign='center';c.fillText(Math.ceil(a.bomb/10),0,-54)}c.restore();
 }
 draw(game,cursor,selected=7){
  if(game.changed||Math.floor(game.tick/2)!==this.lastObjectFrame)this.terrain(game);
  const c=this.ctx,w=this.canvas.width,h=this.canvas.height;c.imageSmoothingEnabled=true;
  c.fillStyle='#102932';c.fillRect(0,0,w,h);
  if(backdrop.complete&&backdrop.naturalWidth){const offset=this.camera/152*120;c.drawImage(backdrop,-offset,0,w+120,h)}
  c.save();c.globalAlpha=.45;c.fillStyle='#efffc4';
  for(let i=0;i<15;i++){const t=this.reducedMotion?0:game.tick*.025;c.beginPath();c.arc((i*137+Math.sin(t+i)*15-this.camera*1.3+w*2)%w,50+(i*83)%(h-100)+Math.cos(t*.7+i)*10,1.5,0,Math.PI*2);c.fill()}c.restore();
  c.shadowColor='#06151c';c.shadowBlur=8;c.shadowOffsetY=5;c.drawImage(this.surface,this.camera*8,0,1280,h,0,0,w,h);c.shadowBlur=0;c.shadowOffsetY=0;
  const exit=this.level.exit,x=(exit.x+4-this.camera)*8,y=(exit.y+23)*4;
  c.save();c.translate(x,y);c.fillStyle='#1b493c';c.strokeStyle='#d0c486';c.lineWidth=4;c.beginPath();c.roundRect(-19,-62,38,62,[19,19,0,0]);c.fill();c.stroke();
  const glow=c.createRadialGradient(0,-25,2,0,-25,43);glow.addColorStop(0,'#d7ffae66');glow.addColorStop(1,'#b7eb9100');c.fillStyle=glow;c.fillRect(-44,-68,88,75);c.fillStyle='#eaffba';c.font='bold 9px sans-serif';c.textAlign='center';c.fillText('HOME',0,-45);c.restore();
  for(const a of game.actors)if(a.state!=='gone'&&a.x>=this.camera-10&&a.x<=this.camera+170)this.actor(c,a);
  if(cursor){const target=game.pick(cursor.x,cursor.y,selected),x=(cursor.x-this.camera)*8,y=cursor.y*4;c.strokeStyle=target?'#e8ffc2':'#ffffff99';c.lineWidth=2;c.beginPath();c.arc(x,y,15,0,Math.PI*2);c.stroke();line(c,x-21,y,x-12,y,c.strokeStyle,2);line(c,x+12,y,x+21,y,c.strokeStyle,2)}
 }
}
