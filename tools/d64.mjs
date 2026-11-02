// Read original 35-track D64 files without changing the image.
export function directory(disk){
  if(disk.length!==174848)throw Error('Expected a standard 35-track D64');
  const offset=(track,sector)=>{if(track<1||track>35)throw Error('Invalid D64 track');let count=0;for(let t=1;t<track;t++)count+=t<=17?21:t<=24?19:t<=30?18:17;const max=track<=17?21:track<=24?19:track<=30?18:17;if(sector<0||sector>=max)throw Error('Invalid D64 sector');return(count+sector)*256};
  const files=[],visited=new Set();let track=18,sector=1;
  while(track){const pos=offset(track,sector);if(visited.has(pos))throw Error('Cyclic directory');visited.add(pos);
    for(let n=0;n<8;n++){const p=pos+n*32;if(!(disk[p+2]&7))continue;const name=disk.subarray(p+5,p+21).toString('latin1').replace(/\xa0+$/,'');const start=[disk[p+3],disk[p+4]];
      files.push({name,read(){let[t,s]=start;const parts=[],seen=new Set();while(t){const p=offset(t,s);if(seen.has(p))throw Error('Cyclic file chain');seen.add(p);const next=disk[p],last=disk[p+1];parts.push(disk.subarray(p+2,p+(next?256:last+1)));t=next;s=last}return Buffer.concat(parts)}});
    }track=disk[pos];sector=disk[pos+1];
  }return files;
}
