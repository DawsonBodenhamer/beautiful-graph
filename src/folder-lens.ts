export function isPathInFolder(path:string,folder:string):boolean{return folder===""||path.startsWith(`${folder}/`)}
export const isPathInFolderScope=isPathInFolder;
export function folderDisplayName(path:string):string{const name=path.split("/").filter(Boolean).at(-1)??"Vault Root";return name.replaceAll("_"," ").replace(/\b\w/g,letter=>letter.toUpperCase())}
export function lensRadius(nodeRadius:number,localSpacing:number,setting:number):number{return Math.max(18,Math.min(70,nodeRadius*2.5+localSpacing*.35))*setting}
export function unionLensMembership(paths:string[],folders:Iterable<string>):Set<string>{const selected=[...folders];return new Set(paths.filter(path=>selected.some(folder=>isPathInFolder(path,folder))))}
