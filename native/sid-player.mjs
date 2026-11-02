import {MusicCPU} from './sid-cpu.mjs';
import {jsSID} from '../vendor/jssid/resid.mjs';
export const PAL_CLOCK=985248;
export class OriginalSID {
 constructor(bytes,rate=48000){if(bytes.length!==0xc00)throw Error('Invalid SID program');this.source=new Uint8Array(bytes);this.rate=rate;this.sid=new jsSID.ReSID({clock:PAL_CLOCK,model:0,sampleRate:rate,method:jsSID.ReSID.sampling_method.SAMPLE_INTERPOLATE});this.writes=0;this.frames=0;this.samples=0;this.nextFrame=0;this.muted=false;this.paused=true;this.volume=.35;this.reset()}
 reset(){this.sid.reset();this.memory=new Uint8Array(65536);this.memory.set(this.source,0x3000);this.cpu=new MusicCPU(this.memory,(a,v)=>{if(a>=0xd400&&a<=0xd418){this.sid.write(a-0xd400,v);this.writes++}});this.cpu.call(0x3000);for(let x=0;x<3;x++)this.cpu.call(0x3003,{a:[1,2,0][x],x});this.frames=0;this.samples=0;this.nextFrame=0}
 effect(name){const sequence={assign:0x1a,rescue:0x1b,death:0x1e}[name];if(sequence!==undefined)this.cpu.call(0x3003,{a:sequence,x:2})}
 render(buffer){buffer.fill(0);if(this.paused)return;let offset=0;while(offset<buffer.length){if(this.samples>=this.nextFrame){this.cpu.call(0x3006);this.frames++;this.nextFrame=Math.round(this.frames*this.rate/50)}const count=Math.min(buffer.length-offset,this.nextFrame-this.samples),cycles=Math.floor((this.sid.sample_offset+count*this.sid.cycles_per_sample)/65536),written=this.sid.clock(cycles,buffer,count,1,offset);if(written!==count)throw Error('Standalone SID sample accounting failed');offset+=count;this.samples+=count}for(let i=0;i<buffer.length;i++)buffer[i]*=this.muted?0:this.volume}
}
