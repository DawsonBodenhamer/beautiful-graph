export type SharedCoordinatePublication={buffer:SharedArrayBuffer;publication:number;count:number};

export class SharedCoordinateWriter{
  private buffer?:SharedArrayBuffer;
  private coordinates?:Float32Array;
  private version?:Int32Array;
  private count=-1;

  ensureCapacity(count:number):boolean{
    if(this.buffer&&this.count===count)return false;
    this.count=count;
    this.buffer=new SharedArrayBuffer(count*Float32Array.BYTES_PER_ELEMENT*2+Int32Array.BYTES_PER_ELEMENT);
    this.coordinates=new Float32Array(this.buffer,0,count*2);
    this.version=new Int32Array(this.buffer,count*Float32Array.BYTES_PER_ELEMENT*2,1);
    return true;
  }

  publish(values:ArrayLike<number>):SharedCoordinatePublication{
    if(!this.buffer||!this.coordinates||!this.version||values.length!==this.count*2)throw new Error("Shared coordinate capacity does not match the publication.");
    Atomics.add(this.version,0,1);
    this.coordinates.set(values);
    const publication=Atomics.add(this.version,0,1)+1;
    return{buffer:this.buffer,publication,count:this.count};
  }

  publishPoints(points:ArrayLike<{x:number;y:number}>):SharedCoordinatePublication{
    if(!this.buffer||!this.coordinates||!this.version||points.length!==this.count)throw new Error("Shared coordinate capacity does not match the publication.");
    Atomics.add(this.version,0,1);
    for(let index=0;index<points.length;index++){const point=points[index]!;this.coordinates[index*2]=point.x;this.coordinates[index*2+1]=point.y}
    const publication=Atomics.add(this.version,0,1)+1;
    return{buffer:this.buffer,publication,count:this.count};
  }
}

export function readSharedCoordinates(publication:SharedCoordinatePublication,target:Float32Array,afterCopy?:()=>void):boolean{
  if(target.length<publication.count*2)return false;
  const version=new Int32Array(publication.buffer,publication.count*Float32Array.BYTES_PER_ELEMENT*2,1),before=Atomics.load(version,0);
  if((before&1)!==0||before!==publication.publication)return false;
  target.set(new Float32Array(publication.buffer,0,publication.count*2).subarray(0,publication.count*2));
  afterCopy?.();
  return Atomics.load(version,0)===before;
}

export class LatestCoordinateResult<T>{
  private pending?:T;
  push(value:T):void{this.pending=value}
  take():T|undefined{const value=this.pending;this.pending=undefined;return value}
  clear():void{this.pending=undefined}
  get size():0|1{return this.pending===undefined?0:1}
}
