export interface LensContourPoint { x:number; y:number; radius:number }
export interface LensContourOptions { padding:number; maxGridCells?:number; smoothingPasses?:number }
export interface LensContourResult { contours:{x:number;y:number}[][]; cellSize:number; columns:number; rows:number }

type GridPoint={x:number;y:number};

function key(point:GridPoint):string{return `${point.x},${point.y}`}
function polygonArea(points:GridPoint[]):number {let area=0;for(let index=0;index<points.length;index++){const a=points[index]!,b=points[(index+1)%points.length]!;area+=a.x*b.y-b.x*a.y}return area/2}
function smoothClosed(points:GridPoint[],passes:number):GridPoint[]{let result=points;for(let pass=0;pass<passes;pass++){const next:GridPoint[]=[];for(let index=0;index<result.length;index++){const a=result[index]!,b=result[(index+1)%result.length]!;next.push({x:a.x*.75+b.x*.25,y:a.y*.75+b.y*.25},{x:a.x*.25+b.x*.75,y:a.y*.25+b.y*.75})}result=next}return result}

export function buildLensContours(points:LensContourPoint[],options:LensContourOptions):LensContourResult {
  if(!points.length)return{contours:[],cellSize:1,columns:0,rows:0};
  const padding=Math.max(4,options.padding),maxGrid=Math.max(48,options.maxGridCells??180),passes=Math.max(0,options.smoothingPasses??2);
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const point of points){const reach=Math.max(1,point.radius)+padding;minX=Math.min(minX,point.x-reach);minY=Math.min(minY,point.y-reach);maxX=Math.max(maxX,point.x+reach);maxY=Math.max(maxY,point.y+reach)}
  const width=Math.max(1,maxX-minX),height=Math.max(1,maxY-minY),cellSize=Math.max(3,padding/4,width/maxGrid,height/maxGrid),columns=Math.max(1,Math.ceil(width/cellSize)),rows=Math.max(1,Math.ceil(height/cellSize)),occupied=new Uint8Array(columns*rows);
  for(const point of points){const reach=Math.max(1,point.radius)+padding,r2=reach*reach,left=Math.max(0,Math.floor((point.x-reach-minX)/cellSize)),right=Math.min(columns-1,Math.ceil((point.x+reach-minX)/cellSize)),top=Math.max(0,Math.floor((point.y-reach-minY)/cellSize)),bottom=Math.min(rows-1,Math.ceil((point.y+reach-minY)/cellSize));for(let row=top;row<=bottom;row++){const y=minY+(row+.5)*cellSize;for(let column=left;column<=right;column++){const x=minX+(column+.5)*cellSize,dx=x-point.x,dy=y-point.y;if(dx*dx+dy*dy<=r2)occupied[row*columns+column]=1}}}
  const outgoing=new Map<string,GridPoint[]>(),add=(from:GridPoint,to:GridPoint)=>{const list=outgoing.get(key(from))??[];list.push(to);outgoing.set(key(from),list)},filled=(column:number,row:number)=>column>=0&&row>=0&&column<columns&&row<rows&&occupied[row*columns+column]===1;
  for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){if(!filled(column,row))continue;if(!filled(column,row-1))add({x:column,y:row},{x:column+1,y:row});if(!filled(column+1,row))add({x:column+1,y:row},{x:column+1,y:row+1});if(!filled(column,row+1))add({x:column+1,y:row+1},{x:column,y:row+1});if(!filled(column-1,row))add({x:column,y:row+1},{x:column,y:row})}
  const loops:GridPoint[][]=[];while(outgoing.size){const firstEntry=outgoing.entries().next().value as [string,GridPoint[]]|undefined;if(!firstEntry)break;const [startKey]=firstEntry,[sx,sy]=startKey.split(",").map(Number),start={x:sx!,y:sy!},loop=[start];let current=start;for(let guard=0;guard<(columns+rows)*16;guard++){const list=outgoing.get(key(current));if(!list?.length)break;const next=list.pop()!;if(!list.length)outgoing.delete(key(current));if(next.x===start.x&&next.y===start.y)break;loop.push(next);current=next}if(loop.length>=8)loops.push(loop)}
  // Exterior boundaries follow the occupied-cell winding; interior holes use
  // the opposite winding. Ignoring holes produces a single true union fill
  // instead of drawing a second translucent polygon over the same lens.
  const contours=loops.map(loop=>smoothClosed(loop.map(point=>({x:minX+point.x*cellSize,y:minY+point.y*cellSize})),passes)).filter(loop=>polygonArea(loop)>cellSize*cellSize*3).sort((a,b)=>polygonArea(b)-polygonArea(a));
  return{contours,cellSize,columns,rows};
}
