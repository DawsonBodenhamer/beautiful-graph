export class SettingsHistory<T> {
  private undoStack:T[]=[];
  private redoStack:T[]=[];
  private pendingBefore?:T;
  private limit:number;
  private clone:(value:T)=>T;
  constructor(limit=50,clone:(value:T)=>T=(value)=>structuredClone(value)){this.limit=limit;this.clone=clone}
  setLimit(limit:number):void{this.limit=Math.max(10,limit);this.trim()}
  recordBefore(value:T):void{if(!this.pendingBefore)this.pendingBefore=this.clone(value)}
  commit(current:T):boolean{if(!this.pendingBefore||this.equal(this.pendingBefore,current))return false;this.undoStack.push(this.pendingBefore);this.pendingBefore=undefined;this.trim();this.redoStack=[];return true}
  undo(current:T):T|undefined{this.pendingBefore=undefined;while(this.undoStack.length){const previous=this.undoStack.pop()!;if(this.equal(previous,current))continue;this.redoStack.push(this.clone(current));return this.clone(previous)}return undefined}
  redo(current:T):T|undefined{this.pendingBefore=undefined;while(this.redoStack.length){const next=this.redoStack.pop()!;if(this.equal(next,current))continue;this.undoStack.push(this.clone(current));this.trim();return this.clone(next)}return undefined}
  get canUndo():boolean{return this.undoStack.length>0}
  get canRedo():boolean{return this.redoStack.length>0}
  private trim():void{if(this.undoStack.length>this.limit)this.undoStack.splice(0,this.undoStack.length-this.limit);if(this.redoStack.length>this.limit)this.redoStack.splice(0,this.redoStack.length-this.limit)}
  private equal(a:T,b:T):boolean{return JSON.stringify(a)===JSON.stringify(b)}
}
