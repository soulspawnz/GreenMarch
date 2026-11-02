let musicBytes;
async function music(){
 if(!musicBytes)musicBytes=fetch(new URL('./assets/enhanced/woodland-march.mp3',import.meta.url)).then(r=>{if(!r.ok)throw Error('Enhanced soundtrack is unavailable');return r.arrayBuffer()}).catch(error=>{musicBytes=null;throw error});
 return musicBytes;
}
export class EnhancedAudio {
 constructor(){this.context=null;this.paused=true;this.muted=false;this.volume=.35;this.offset=0;this.voices=new Set();this.stats={ac:0,frames:0,writes:0}}
 async start(){
  if(!this.context){
   this.context=new AudioContext();this.gain=this.context.createGain();this.analyser=this.context.createAnalyser();this.gain.connect(this.analyser);this.analyser.connect(this.context.destination);
   try{this.buffer=await this.context.decodeAudioData((await music()).slice(0))}catch(error){await this.close();throw error}
  }
  await this.context.resume();this.configure();
 }
 stopSource(){if(!this.source)return;this.offset=(this.offset+this.context.currentTime-this.started)%this.buffer.duration;this.source.stop();this.source.disconnect();this.source=null}
 configure(){
  if(!this.context||!this.buffer)return;
  this.gain.gain.setValueAtTime(this.paused||this.muted?0:Math.max(0,Math.min(.6,this.volume)),this.context.currentTime);
  if(this.paused){this.stopSource();for(const voice of this.voices)voice.stop();this.voices.clear()}
  else if(!this.source){this.source=this.context.createBufferSource();this.source.buffer=this.buffer;this.source.loop=true;this.source.connect(this.gain);this.started=this.context.currentTime;this.source.start(0,this.offset)}
 }
 reset(){this.stopSource();this.offset=0;this.configure()}
 effect(name){
  if(!this.context||this.paused||this.muted)return;
  const pitches={assign:[620,830],dig:[130,90],rescue:[660,880,1320],death:[210,110],explosion:[65,30],'build-warning':[740,740]}[name];if(!pitches||this.voices.size>20)return;
  const t=this.context.currentTime;if(name==='dig'&&t-(this.lastDig||0)<.16)return;if(name==='dig')this.lastDig=t;
  pitches.forEach((pitch,i)=>{
   const osc=this.context.createOscillator(),envelope=this.context.createGain(),start=t+i*.07,duration=name==='explosion'?.45:.13;
   osc.type=name==='explosion'?'sawtooth':name==='dig'?'triangle':'sine';osc.frequency.setValueAtTime(pitch,start);osc.frequency.exponentialRampToValueAtTime(pitch*(name==='rescue'?1.08:.7),start+duration);
   envelope.gain.setValueAtTime(.0001,start);envelope.gain.exponentialRampToValueAtTime(name==='rescue'?.25:.14,start+.008);envelope.gain.exponentialRampToValueAtTime(.0001,start+duration);
   osc.connect(envelope);envelope.connect(this.gain);this.voices.add(osc);osc.onended=()=>{this.voices.delete(osc);osc.disconnect();envelope.disconnect()};osc.start(start);osc.stop(start+duration+.01);
  });
 }
 measure(){if(!this.analyser)return 0;const a=new Float32Array(this.analyser.fftSize);this.analyser.getFloatTimeDomainData(a);let mean=0,sum=0;for(const v of a)mean+=v;mean/=a.length;for(const v of a)sum+=(v-mean)**2;return Math.sqrt(sum/a.length)}
 async close(){this.paused=true;this.configure();this.gain?.disconnect();this.analyser?.disconnect();if(this.context&&this.context.state!=='closed')await this.context.close();this.context=null;this.buffer=null;this.source=null}
}
