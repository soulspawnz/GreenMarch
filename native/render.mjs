export function animationFrame(level,actor){
 let type;
 if(['walk','climb','hoist','build','bash','mine'].includes(actor.state))type=actor.state+(actor.dir>0?'Right':'Left');
 else type={block:'block',dig:'dig',exit:'exit',splat:'splat',explode:'explode',drown:'drown',float:'float',shrug:'shrug'}[actor.state]||'fall';
 const animation=level.animation[type]||level.animation.walkRight;
 let phase=actor.phase;
 if(animation.loopStart!==undefined&&phase>=animation.count)phase=animation.loopStart+(phase-animation.loopStart)%(animation.count-animation.loopStart);
 else phase%=animation.count;
 return animation.start+phase*(animation.stride||1);
}

export class Renderer {
 constructor(canvas,level,frames){
  this.canvas=canvas;this.ctx=canvas.getContext('2d');this.level=level;this.frames=frames;
  this.camera=level.camera;this.width=160;canvas.width=this.width*4;canvas.height=level.height*2;
  this.ctx.imageSmoothingEnabled=false;this.pixelCanvas=document.createElement('canvas');
  this.pixelCanvas.width=level.width*2;this.pixelCanvas.height=level.height;this.pixelContext=this.pixelCanvas.getContext('2d');
  this.rgb=level.palette.map(hex=>[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)]);
  this.atlas=[];this.lastObjectFrame=-1;
  for(let frame=0;frame<300;frame++){
   const image=new ImageData(16,16);
   for(let y=0;y<16;y++)for(let x=0;x<8;x++){const color=frames[frame*128+y*8+x];if(!color)continue;
    for(let d=0;d<2;d++)image.data.set([...this.rgb[level.actorColors[color]],255],(y*16+x*2+d)*4);
   }
   const sprite=document.createElement('canvas');sprite.width=16;sprite.height=16;sprite.getContext('2d').putImageData(image,0,0);this.atlas.push(sprite);
  }
 }
 scroll(delta){this.camera=Math.max(0,Math.min(this.level.width-this.width,this.camera+delta))}
 point(event){const box=this.canvas.getBoundingClientRect();return {x:this.camera+(event.clientX-box.left)/box.width*this.width,y:(event.clientY-box.top)/box.height*this.level.height}}
 terrain(game){
  const image=new ImageData(this.level.width*2,this.level.height),paint=(x,y,color)=>{
   if(x<0||y<0||x>=this.level.width||y>=this.level.height)return;
   for(let d=0;d<2;d++)image.data.set([...this.rgb[color],255],(y*this.level.width*2+x*2+d)*4);
  };
  for(let y=0;y<this.level.height;y++)for(let x=0;x<this.level.width;x++)paint(x,y,this.level.terrainColors[game.terrain[y*this.level.width+x]]);
  if(this.level.objects){
   const clock=Math.floor(game.tick/2);
   for(const object of this.level.objects){
    const flags=object.flags,maximum=(flags>>3)&7;
    const frame=flags&128?(flags&64?clock%Math.max(1,maximum):Math.min(clock,Math.max(0,maximum-1))):0;
    if((flags&7)!==frame)continue;
    for(const [x,y,byte] of object.rows)for(let dx=0;dx<4;dx++){
     const value=(byte>>(6-dx*2))&3;if(!value)continue;
     const at=y*this.level.width+x+dx;paint(x+dx,y,this.level.terrainColors[game.terrain[at]|value]);
    }
   }
  }else for(const portal of this.level.portals||[])for(let y=0;y<portal.height;y++)for(let x=0;x<portal.width;x++){
   const v=portal.pixels[y*portal.width+x];if(v!==255)paint(portal.x+x,portal.y+y,this.level.terrainColors[v]);
  }
  for(const water of this.level.water||[]){
   const frame=this.level.waterTiles?.[Math.floor(game.tick/2)%4];if(!frame)continue;
   for(let y=0;y<water.height;y++)for(let x=0;x<water.width;x++){
    const value=y<8?(frame[y]>>(6-(x%4)*2))&3:3;
    paint(water.x+x,water.y+y,(this.level.waterColors||this.level.actorColors)[value]);
   }
  }
  this.pixelContext.putImageData(image,0,0);game.changed=false;this.lastObjectFrame=Math.floor(game.tick/2);
 }
 draw(game,cursor,selected=7){
  if(game.changed||(this.level.objects||this.level.water?.length)&&Math.floor(game.tick/2)!==this.lastObjectFrame)this.terrain(game);
  const c=this.ctx;c.fillStyle='#000';c.fillRect(0,0,this.canvas.width,this.canvas.height);
  c.drawImage(this.pixelCanvas,this.camera*2,0,this.width*2,this.level.height,0,0,this.canvas.width,this.canvas.height);
  for(const a of game.actors){if(a.state==='gone')continue;
   c.drawImage(this.atlas[animationFrame(this.level,a)],(a.x-4-this.camera)*4,(a.y-16)*2,32,32);
   if(a.bomb>0){c.fillStyle='#fff';c.font='12px monospace';c.textAlign='center';c.fillText(String(Math.ceil(a.bomb/10)),(a.x-this.camera)*4,(a.y-18)*2)}
  }
  if(cursor){
   const actor=game.pick(cursor.x,cursor.y,selected);c.strokeStyle=actor&&game.skills[selected]>0?'#b0d66b':'#fff';c.lineWidth=2;
   const x=(cursor.x-this.camera)*4,y=cursor.y*2;c.strokeRect(x-9,y-9,18,18);c.beginPath();c.moveTo(x-15,y);c.lineTo(x+15,y);c.moveTo(x,y-15);c.lineTo(x,y+15);c.stroke();
  }
 }
}
