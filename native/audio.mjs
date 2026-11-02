export class Audio {
 constructor(bytes){this.bytes=bytes;this.context=null;this.node=null;this.stats={ac:0,frames:0,writes:0};this.muted=false;this.volume=.35;this.paused=true}
 async start(){if(!this.context){this.context=new AudioContext();await this.context.audioWorklet.addModule(new URL('./sid-worklet.mjs',import.meta.url));this.node=new AudioWorkletNode(this.context,'greenmarch-original-sid',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[1]});this.node.port.onmessage=({data})=>{if(data.type==='error'){this.error=data.message;console.error(data.message)}else if(data.type==='stats')this.stats=data};this.node.connect(this.context.destination);this.node.port.postMessage({type:'init',bytes:this.bytes});this.analyser=this.context.createAnalyser();this.node.connect(this.analyser)}await this.context.resume();this.configure()}
 configure(){this.node?.port.postMessage({type:'configure',paused:this.paused,muted:this.muted,volume:this.volume})}
 pause(value){this.paused=value;this.configure()}
 reset(){this.node?.port.postMessage({type:'reset'});this.configure()}
 effect(name){this.node?.port.postMessage({type:'effect',name})}
 measure(){if(!this.analyser)return 0;const samples=new Float32Array(this.analyser.fftSize);this.analyser.getFloatTimeDomainData(samples);let mean=0,sum=0;for(const s of samples)mean+=s;mean/=samples.length;for(const s of samples)sum+=(s-mean)**2;return Math.sqrt(sum/samples.length)}
 async close(){this.node?.disconnect();this.analyser?.disconnect();if(this.context&&this.context.state!=='closed')await this.context.close();this.node=null;this.analyser=null;this.context=null}
}
