export const THOROUGH_ANALYSIS_TIMEOUT_MS=60_000;

type Schedule=(callback:()=>void,delay:number)=>unknown;
type Cancel=(handle:unknown)=>void;

export class WorkerRunWatchdog<T extends object> {
  private worker?:T;
  private generation=-1;
  private handle?:unknown;
  private readonly timeoutMs:number;
  private readonly schedule:Schedule;
  private readonly cancel:Cancel;

  constructor(
    timeoutMs=THOROUGH_ANALYSIS_TIMEOUT_MS,
    schedule:Schedule=(callback,delay)=>globalThis.setTimeout(callback,delay),
    cancel:Cancel=handle=>globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
  ){this.timeoutMs=timeoutMs;this.schedule=schedule;this.cancel=cancel}

  arm(worker:T,generation:number,onTimeout:()=>void):void {
    this.clear();
    this.worker=worker;
    this.generation=generation;
    const handle=this.schedule(()=>{
      if(this.worker!==worker||this.generation!==generation||this.handle!==handle)return;
      this.handle=undefined;
      this.worker=undefined;
      this.generation=-1;
      onTimeout();
    },this.timeoutMs);
    this.handle=handle;
  }

  clear(worker?:T,generation?:number):boolean {
    if(worker!==undefined&&(this.worker!==worker||this.generation!==generation))return false;
    if(this.handle!==undefined)this.cancel(this.handle);
    const active=this.handle!==undefined||this.worker!==undefined;
    this.handle=undefined;
    this.worker=undefined;
    this.generation=-1;
    return active;
  }

  matches(worker:T,generation:number):boolean {return this.worker===worker&&this.generation===generation}
}

export interface WorkerFailureRecovery {
  revealStartup:boolean;
  persistPositions:false;
  markLayoutConverged:false;
}

export function workerFailureRecovery(startupPending:boolean):WorkerFailureRecovery {
  return{revealStartup:startupPending,persistPositions:false,markLayoutConverged:false};
}
