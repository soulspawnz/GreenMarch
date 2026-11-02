// Bounded NMOS 6502 subroutine runner for original music only. No C64 hardware,
// ROM, disk, video, interrupts or gameplay execution is provided.
const table=new Array(256);
const define=(op,entries)=>{for(const [hex,mode] of entries.split(' ').map(s=>s.split(':')))table[parseInt(hex,16)]={op,mode}};
define('ORA','01:ix 05:z 09:i 0d:a 11:iy 15:zx 19:ay 1d:ax');
define('AND','21:ix 25:z 29:i 2d:a 31:iy 35:zx 39:ay 3d:ax');
define('EOR','41:ix 45:z 49:i 4d:a 51:iy 55:zx 59:ay 5d:ax');
define('ADC','61:ix 65:z 69:i 6d:a 71:iy 75:zx 79:ay 7d:ax');
define('STA','81:ix 85:z 8d:a 91:iy 95:zx 99:ay 9d:ax');
define('LDA','a1:ix a5:z a9:i ad:a b1:iy b5:zx b9:ay bd:ax');
define('CMP','c1:ix c5:z c9:i cd:a d1:iy d5:zx d9:ay dd:ax');
define('SBC','e1:ix e5:z e9:i ed:a f1:iy f5:zx f9:ay fd:ax');
define('ASL','06:z 0a:r 0e:a 16:zx 1e:ax');define('ROL','26:z 2a:r 2e:a 36:zx 3e:ax');
define('LSR','46:z 4a:r 4e:a 56:zx 5e:ax');define('ROR','66:z 6a:r 6e:a 76:zx 7e:ax');
define('STX','86:z 8e:a 96:zy');define('LDX','a2:i a6:z ae:a b6:zy be:ay');
define('DEC','c6:z ce:a d6:zx de:ax');define('INC','e6:z ee:a f6:zx fe:ax');
define('STY','84:z 8c:a 94:zx');define('LDY','a0:i a4:z ac:a b4:zx bc:ax');
define('CPY','c0:i c4:z cc:a');define('CPX','e0:i e4:z ec:a');define('BIT','24:z 2c:a');
for(const [hex,op] of Object.entries({'10':'BPL','30':'BMI','50':'BVC','70':'BVS','90':'BCC','b0':'BCS','d0':'BNE','f0':'BEQ','18':'CLC','38':'SEC','58':'CLI','78':'SEI','b8':'CLV','d8':'CLD','f8':'SED','48':'PHA','68':'PLA','08':'PHP','28':'PLP','aa':'TAX','a8':'TAY','8a':'TXA','98':'TYA','ba':'TSX','9a':'TXS','ca':'DEX','88':'DEY','e8':'INX','c8':'INY','ea':'NOP','20':'JSR','60':'RTS','4c':'JMP','6c':'JMI'}))table[parseInt(hex,16)]={op,mode:''};
export class MusicCPU {
 constructor(memory=new Uint8Array(65536),write=()=>{}){this.m=memory;this.onWrite=write;this.a=0;this.x=0;this.y=0;this.p=0x20;this.s=0xfd;this.pc=0;this.instructions=0}
 set(a,v){a&=65535;this.m[a]=v&255;this.onWrite(a,v&255)}
 byte(){const b=this.m[this.pc];this.pc=(this.pc+1)&65535;return b}
 word(){return this.byte()|(this.byte()<<8)}
 push(v){this.set(0x100+this.s,v);this.s=(this.s-1)&255}
 pop(){this.s=(this.s+1)&255;return this.m[0x100+this.s]}
 nz(v){v&=255;this.p=(this.p&0x7d)|(v===0?2:0)|(v&128);return v}
 flag(bit,on){this.p=on?this.p|bit:this.p&~bit}
 address(mode){let a;switch(mode){case'i':a=this.pc;this.pc=(this.pc+1)&65535;return a;case'z':return this.byte();case'zx':return(this.byte()+this.x)&255;case'zy':return(this.byte()+this.y)&255;case'a':return this.word();case'ax':return(this.word()+this.x)&65535;case'ay':return(this.word()+this.y)&65535;case'ix':a=(this.byte()+this.x)&255;return this.m[a]|(this.m[(a+1)&255]<<8);case'iy':a=this.byte();return((this.m[a]|(this.m[(a+1)&255]<<8))+this.y)&65535}return-1}
 step(){const at=this.pc,code=this.byte(),d=table[code];if(!d)throw Error(`Unsupported music opcode ${code.toString(16)} at ${at.toString(16)}`);const addr=this.address(d.mode),v=d.mode==='r'?this.a:addr>=0?this.m[addr]:0;let r,c;
 switch(d.op){
 case'LDA':this.a=this.nz(v);break;case'LDX':this.x=this.nz(v);break;case'LDY':this.y=this.nz(v);break;
 case'STA':this.set(addr,this.a);break;case'STX':this.set(addr,this.x);break;case'STY':this.set(addr,this.y);break;
 case'ORA':this.a=this.nz(this.a|v);break;case'AND':this.a=this.nz(this.a&v);break;case'EOR':this.a=this.nz(this.a^v);break;
 case'ADC':{const a=this.a,carry=this.p&1,sum=a+v+carry;this.flag(64,~(a^v)&(a^sum)&128);r=sum;if(this.p&8){let lo=(a&15)+(v&15)+carry;if(lo>9)lo+=6;r=(a&240)+(v&240)+lo;if(r>0x99)r+=0x60}this.flag(1,r>255);this.a=this.nz(r);break}
 case'SBC':{const a=this.a,borrow=1-(this.p&1),sum=a-v-borrow;this.flag(64,(a^v)&(a^sum)&128);r=sum;if(this.p&8){let lo=(a&15)-(v&15)-borrow,hi=(a>>4)-(v>>4);if(lo<0){lo-=6;hi--}if(hi<0)hi-=6;r=(hi<<4)|(lo&15)}this.flag(1,sum>=0);this.a=this.nz(r);break}
 case'CMP':case'CPX':case'CPY':r=d.op==='CMP'?this.a:d.op==='CPX'?this.x:this.y;this.flag(1,r>=v);this.nz(r-v);break;
 case'BIT':this.flag(2,(this.a&v)===0);this.p=(this.p&0x3f)|(v&0xc0);break;
 case'ASL':case'LSR':case'ROL':case'ROR':c=this.p&1;if(d.op==='ASL'||d.op==='ROL'){this.flag(1,v&128);r=(v<<1)|(d.op==='ROL'?c:0)}else{this.flag(1,v&1);r=(v>>1)|(d.op==='ROR'?c<<7:0)}r=this.nz(r);if(d.mode==='r')this.a=r;else this.set(addr,r);break;
 case'INC':this.set(addr,this.nz(v+1));break;case'DEC':this.set(addr,this.nz(v-1));break;
 case'INX':this.x=this.nz(this.x+1);break;case'DEX':this.x=this.nz(this.x-1);break;case'INY':this.y=this.nz(this.y+1);break;case'DEY':this.y=this.nz(this.y-1);break;
 case'TAX':this.x=this.nz(this.a);break;case'TAY':this.y=this.nz(this.a);break;case'TXA':this.a=this.nz(this.x);break;case'TYA':this.a=this.nz(this.y);break;case'TSX':this.x=this.nz(this.s);break;case'TXS':this.s=this.x;break;
 case'PHA':this.push(this.a);break;case'PLA':this.a=this.nz(this.pop());break;case'PHP':this.push(this.p|0x30);break;case'PLP':this.p=(this.pop()|0x20)&~16;break;
 case'CLC':this.flag(1,false);break;case'SEC':this.flag(1,true);break;case'CLI':this.flag(4,false);break;case'SEI':this.flag(4,true);break;case'CLV':this.flag(64,false);break;case'CLD':this.flag(8,false);break;case'SED':this.flag(8,true);break;
 case'JSR':r=this.word();c=(this.pc-1)&65535;this.push(c>>8);this.push(c);this.pc=r;break;
 case'RTS':this.pc=((this.pop()|(this.pop()<<8))+1)&65535;break;
 case'JMP':this.pc=this.word();break;case'JMI':r=this.word();this.pc=this.m[r]|(this.m[(r&0xff00)|((r+1)&255)]<<8);break;
 case'BPL':case'BMI':case'BVC':case'BVS':case'BCC':case'BCS':case'BNE':case'BEQ':r=this.byte();c={BPL:!(this.p&128),BMI:!!(this.p&128),BVC:!(this.p&64),BVS:!!(this.p&64),BCC:!(this.p&1),BCS:!!(this.p&1),BNE:!(this.p&2),BEQ:!!(this.p&2)}[d.op];if(c)this.pc=(this.pc+(r>127?r-256:r))&65535;break;
 case'NOP':break;default:throw Error('Unsupported music operation '+d.op)
 }this.instructions++;
 }
 call(entry,{a=0,x=0,y=0,budget=50000}={}){this.a=a;this.x=x;this.y=y;this.s=0xfd;this.push(0xff);this.push(0xfe);this.pc=entry;for(let i=0;i<budget;i++){if(this.pc===0xffff)return i;this.step()}throw Error('Music subroutine instruction budget exceeded')}
}
