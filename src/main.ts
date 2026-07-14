import { Menu, Notice, Plugin, TFolder } from "obsidian";
import { BeautifulGraphView, BEAUTIFUL_GRAPH_VIEW } from "./graph-view";
import { BeautifulGraphSettingTab } from "./settings";
import type { BeautifulGraphData, BeautifulGraphSettings } from "./types";
import { DEFAULT_DISPLAY, DEFAULT_FORCES } from "./defaults";
import { defaultGroupIcon, GROUP_PALETTE, OTHER_COLOR, ROOT_INDEX_COLOR } from "./groups";
import { migrateAdaptivePanelDefaults, migrateResponsivePanels, migrateRevision10Panels, migrateRevision15Glow } from "./settings-migration";
import { SettingsHistory } from "./settings-history";

const DEFAULTS: BeautifulGraphSettings = { replaceUnderscores:true,capitalizeDirectories:true,maxLabelDirectories:3,forces:{...DEFAULT_FORCES},display:{...DEFAULT_DISPLAY},categoryVisibility:{},groups:[],other:{visible:true,color:OTHER_COLOR,icon:"📂"},rootIndex:{enabled:true,color:ROOT_INDEX_COLOR,icon:"🌱",includeLinked:false},otherVisible:true,groupPalette:"Beautiful Default",groupPresets:{},panels:{groups:{visible:true,collapsed:false,pinned:true,autoHeight:true,width:.13},forces:{visible:true,collapsed:false,pinned:true,autoHeight:true,width:.13},display:{visible:true,collapsed:false,pinned:true,autoHeight:true,width:.13}},forcePresets:{},displayPresets:{},historyLimit:50 };

export default class BeautifulGraphPlugin extends Plugin {
  settings: BeautifulGraphSettings = structuredClone(DEFAULTS);
  data: BeautifulGraphData = {version:12,settings:this.settings,positions:{}};
  private lastGraph?: BeautifulGraphView;
  private graphViews=new Set<BeautifulGraphView>();
  private settingsHistory=new SettingsHistory<BeautifulGraphSettings>(50);
  private fileExplorerBridgeInstalled = false;
  private diagnosticWrites:Promise<void>=Promise.resolve();
  readonly diagnosticPath=".obsidian/plugins/beautiful-graph/diagnostics.log";
  async onload():Promise<void>{
    await this.resetDiagnostics();
    const old=await this.loadData() as Partial<BeautifulGraphData>&{settings?:Partial<BeautifulGraphSettings>};
    const oldDisplay=old?.settings?.display as Partial<BeautifulGraphSettings["display"]>&{hideSearchSatellites?:boolean}|undefined;
    this.settings={...structuredClone(DEFAULTS),...old?.settings,forces:{...DEFAULTS.forces,...old?.settings?.forces},display:{...DEFAULTS.display,...oldDisplay,showLinkedInSearch:oldDisplay?.showLinkedInSearch??(oldDisplay?.hideSearchSatellites===undefined?false:!oldDisplay.hideSearchSatellites)},panels:{...DEFAULTS.panels,...old?.settings?.panels}};
    const legacy=old?.settings as (Partial<BeautifulGraphSettings>&{otherVisible?:boolean;groupPalette?:string})|undefined;
    this.settings.other={...DEFAULTS.other,...legacy?.other,visible:legacy?.other?.visible??legacy?.otherVisible??true};
    this.settings.rootIndex={...DEFAULTS.rootIndex,...legacy?.rootIndex};
    if(!legacy?.rootIndex?.icon)this.settings.rootIndex.icon="🌱";
    if(!this.settings.other.icon)this.settings.other.icon="📂";
    for(const [id,state] of Object.entries(this.settings.panels)){if(state.collapsed&&id==="forces")state.collapsed=false;if(!state.collapsed&&state.height!==undefined&&state.height>1&&state.height<=44)delete state.height}
    if(this.settings.groupPalette==="Beautiful Balanced")this.settings.groupPalette="Beautiful Default";
    this.settings.groups=(this.settings.groups??[]).map((g,i)=>({id:g.id??`${g.origin??"manual"}:${g.root}`,root:g.root,color:g.color??GROUP_PALETTE[i%GROUP_PALETTE.length]!,icon:g.icon||defaultGroupIcon(g.root),visible:g.visible!==false,origin:g.origin??"manual",order:i}));
    if((old?.version??0)<7&&this.settings.groupPalette==="Beautiful Default"){const colors:Record<string,string>={dev:"#20B2CF",outputs:"#1FDB2C",raw:"#4E606E",wiki:"#D37203"};for(const group of this.settings.groups)group.color=colors[group.root.toLowerCase()]??group.color}
    // Versions 1-2 could persist layouts produced by unstable or grid-bounded physics.
    migrateRevision10Panels(this.settings.panels,old?.version??0);
    migrateResponsivePanels(this.settings.panels,old?.version??0);
    migrateAdaptivePanelDefaults(this.settings.panels,old?.version??0);
    if((old?.version??0)<11)this.settings.display.recenterOnFocus=false;
    migrateRevision15Glow(this.settings.display,old?.version??0);
    this.settingsHistory.setLimit(this.settings.historyLimit);
    this.data={version:12,settings:this.settings,positions:(old?.version??0)>=3?(old?.positions??{}):{}};
    this.registerView(BEAUTIFUL_GRAPH_VIEW,(leaf)=>new BeautifulGraphView(leaf,this));
    this.addCommand({id:"open-beautiful-graph",name:"Open Beautiful Graph",callback:()=>void this.openGraph()});
    this.addRibbonIcon("orbit","Open Beautiful Graph",()=>void this.openGraph());
    this.addSettingTab(new BeautifulGraphSettingTab(this.app,this));
    this.registerEvent(this.app.workspace.on("active-leaf-change",leaf=>{if(leaf?.view instanceof BeautifulGraphView)this.lastGraph=leaf.view}));
    this.registerEvent(this.app.workspace.on("file-menu",(menu,file)=>{if(file instanceof TFolder)this.addFolderMenu(menu,file)}));
    this.app.workspace.onLayoutReady(()=>this.installFileExplorerSelectionBridge());
  }
  async onunload():Promise<void>{await this.persistData();this.app.workspace.detachLeavesOfType(BEAUTIFUL_GRAPH_VIEW)}
  async openGraph():Promise<void>{const leaf=this.app.workspace.getLeaf("tab");await leaf.setViewState({type:BEAUTIFUL_GRAPH_VIEW,active:true});this.app.workspace.revealLeaf(leaf)}
  async persistData():Promise<void>{this.settingsHistory.commit(this.settings);this.updateHistoryButtons();this.data.settings=this.settings;await this.saveData(this.data)}
  async clearPositions():Promise<void>{this.data.positions={};await this.persistData();new Notice("Beautiful Graph positions cleared.")}
  registerGraph(view:BeautifulGraphView):void{this.lastGraph=view;this.graphViews.add(view);view.updateHistoryButtons(this.settingsHistory.canUndo,this.settingsHistory.canRedo)}
  unregisterGraph(view:BeautifulGraphView):void{this.graphViews.delete(view);if(this.lastGraph===view)this.lastGraph=[...this.graphViews].at(-1)}
  recordSettingsHistory():void{this.settingsHistory.setLimit(this.settings.historyLimit);this.settingsHistory.recordBefore(this.settings)}
  undoGraphSettings():void{const snapshot=this.settingsHistory.undo(this.settings);if(snapshot)this.applyHistorySnapshot(snapshot);else this.updateHistoryButtons()}
  redoGraphSettings():void{const snapshot=this.settingsHistory.redo(this.settings);if(snapshot)this.applyHistorySnapshot(snapshot);else this.updateHistoryButtons()}
  private applyHistorySnapshot(snapshot:BeautifulGraphSettings):void{const previous=this.settings;this.settings=snapshot;this.data.settings=snapshot;for(const view of this.graphViews)view.applySettingsFromHistory(previous);void this.persistData();this.updateHistoryButtons()}
  private updateHistoryButtons():void{for(const view of this.graphViews)view.updateHistoryButtons(this.settingsHistory.canUndo,this.settingsHistory.canRedo)}
  private addFolderMenu(menu:Menu,folder:TFolder):void{const group=this.settings.groups.find(g=>g.root===folder.path);menu.addItem(i=>i.setSection("beautiful-graph").setTitle(group?"Remove from graph Groups":"Add as graph Group").setIcon("folder-tree").onClick(()=>this.lastGraph?.toggleFolderGroup(folder.path)));if(group){menu.addItem(i=>i.setSection("beautiful-graph").setTitle(group.visible?"Hide Group from graph":"Show Group on graph").setIcon("eye").onClick(()=>this.lastGraph?.toggleGroupVisibility(folder.path)));menu.addItem(i=>i.setSection("beautiful-graph").setTitle("Edit graph color and icon…").setIcon("palette").onClick(()=>this.lastGraph?.editFolderGroup(folder.path)));menu.addItem(i=>i.setSection("beautiful-graph").setTitle("Reveal in Groups panel").setIcon("panel-left").onClick(()=>this.lastGraph?.revealFolderGroup(folder.path)))}}
  logDiagnostic(event:string,data:Record<string,unknown>={}):void{const line=JSON.stringify({time:new Date().toISOString(),event,...data})+"\n";this.diagnosticWrites=this.diagnosticWrites.then(()=>this.app.vault.adapter.append(this.diagnosticPath,line)).catch(error=>console.error("Beautiful Graph diagnostic write failed",error))}
  private async resetDiagnostics():Promise<void>{try{await this.app.vault.adapter.write(this.diagnosticPath,JSON.stringify({time:new Date().toISOString(),event:"plugin-load",version:this.manifest.version})+"\n")}catch(error){console.error("Beautiful Graph diagnostic initialization failed",error)}}
  private installFileExplorerSelectionBridge():void{
    if(this.fileExplorerBridgeInstalled)return;this.fileExplorerBridgeInstalled=true;
    this.registerDomEvent(document,"click",event=>{const target=event.target as HTMLElement|null,row=target?.closest<HTMLElement>(".nav-file-title, .nav-folder-title");if(!row)return;const owner=row.closest<HTMLElement>("[data-path]")??row,path=row.dataset.path??owner.dataset.path??owner.getAttribute("data-path");if(!path)return;const nodePath=row.matches(".nav-folder-title")?`${path}/index.md`:path;this.lastGraph?.pinExternalSelection(nodePath)},true);
    this.logDiagnostic("file-explorer-selection-bridge-installed");
  }
}
