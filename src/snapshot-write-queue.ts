export class SnapshotWriteQueue<T> {
  private tail:Promise<void>=Promise.resolve();

  enqueue(value:T,writer:(snapshot:T)=>Promise<void>):Promise<void> {
    const snapshot=structuredClone(value),write=this.tail.then(()=>writer(snapshot));
    this.tail=write.catch(()=>undefined);
    return write;
  }

  flush():Promise<void>{return this.tail}
}
