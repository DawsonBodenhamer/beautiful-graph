export function expandedFocusIds(roots:ReadonlySet<string>,adjacency:ReadonlyMap<string,ReadonlySet<string>>):Set<string> {
  const result=new Set(roots);for(const root of roots)for(const neighbor of adjacency.get(root)??[])result.add(neighbor);return result;
}

export function toggledFocusRoots(current:ReadonlySet<string>,id:string,additive:boolean):Set<string> {
  const next=additive?new Set(current):new Set<string>();if(additive&&next.has(id))next.delete(id);else next.add(id);return next;
}
