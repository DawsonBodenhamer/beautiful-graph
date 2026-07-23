import { App, PluginSettingTab, Setting } from "obsidian";
import type BeautifulGraphPlugin from "./main";

export class BeautifulGraphSettingTab extends PluginSettingTab {
  constructor(app:App,private plugin:BeautifulGraphPlugin){super(app,plugin)}

  display():void {
    this.containerEl.empty();
    new Setting(this.containerEl).setName("Replace underscores").addToggle(toggle=>toggle.setValue(this.plugin.settings.replaceUnderscores).onChange(async value=>{this.plugin.settings.replaceUnderscores=value;await this.plugin.persistData()}));
    new Setting(this.containerEl).setName("Capitalize directory names").addToggle(toggle=>toggle.setValue(this.plugin.settings.capitalizeDirectories).onChange(async value=>{this.plugin.settings.capitalizeDirectories=value;await this.plugin.persistData()}));
    new Setting(this.containerEl)
      .setName("Stored node positions")
      .setDesc("Cooled startup seeds retained for the highest-degree active nodes. Stored positions remain movable.")
      .addSlider(slider=>slider.setLimits(0,15,1).setValue(this.plugin.settings.storedNodeCount).onChange(async value=>{this.plugin.settings.storedNodeCount=value;await this.plugin.persistData()}));
    new Setting(this.containerEl)
      .setName("Recenter multiplier")
      .setDesc("Scales every graph fit. 1.0 preserves the original fit size; values above 1.0 make the graph appear larger.")
      .addSlider(slider=>slider.setLimits(.5,2,.01).setValue(this.plugin.settings.display.recenterMultiplier).onChange(async value=>{this.plugin.settings.display.recenterMultiplier=value;await this.plugin.persistData()}));
    new Setting(this.containerEl).setName("Undo history size").setDesc("Number of recent on-graph control changes retained across Beautiful Graph tabs.").addSlider(slider=>slider.setLimits(10,200,10).setValue(this.plugin.settings.historyLimit).onChange(async value=>{this.plugin.settings.historyLimit=value;await this.plugin.persistData()}));
    new Setting(this.containerEl).setName("Reset panel layout").addButton(button=>button.setButtonText("Reset").onClick(async()=>{for(const state of Object.values(this.plugin.settings.panels)){delete state.x;delete state.y;delete state.z;delete state.width;delete state.height;state.collapsed=false}await this.plugin.persistData()}));
    new Setting(this.containerEl).setName("Clear saved layout").addButton(button=>button.setButtonText("Clear").setClass("mod-warning").onClick(()=>void this.plugin.clearPositions()));
  }
}
