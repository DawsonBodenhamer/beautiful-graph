import { App, PluginSettingTab, Setting } from "obsidian";
import type BeautifulGraphPlugin from "./main";

export class BeautifulGraphSettingTab extends PluginSettingTab {
  constructor(app:App,private plugin:BeautifulGraphPlugin){super(app,plugin)}

  display():void {
    this.containerEl.empty();
    new Setting(this.containerEl).setName("Beautiful Graph").setHeading();
    new Setting(this.containerEl).setName("Replace underscores").addToggle(toggle=>toggle.setValue(this.plugin.settings.replaceUnderscores).onChange(async value=>{this.plugin.settings.replaceUnderscores=value;await this.plugin.persistData()}));
    new Setting(this.containerEl).setName("Capitalize directory names").addToggle(toggle=>toggle.setValue(this.plugin.settings.capitalizeDirectories).onChange(async value=>{this.plugin.settings.capitalizeDirectories=value;await this.plugin.persistData()}));
    new Setting(this.containerEl)
      .setName("Saved anchor nodes")
      .setDesc("Positions retained when the graph closes, ranked from largest node to smallest. Unsaved nodes animate from nearby family anchors on the next open.")
      .addSlider(slider=>slider.setLimits(5,100,5).setDynamicTooltip().setValue(this.plugin.settings.savedNodeCount).onChange(async value=>{this.plugin.settings.savedNodeCount=value;await this.plugin.persistData()}));
    new Setting(this.containerEl).setName("Undo history size").setDesc("Number of recent on-graph control changes retained across Beautiful Graph tabs.").addSlider(slider=>slider.setLimits(10,200,10).setDynamicTooltip().setValue(this.plugin.settings.historyLimit).onChange(async value=>{this.plugin.settings.historyLimit=value;await this.plugin.persistData()}));
    new Setting(this.containerEl).setName("Reset panel layout").addButton(button=>button.setButtonText("Reset").onClick(async()=>{for(const state of Object.values(this.plugin.settings.panels)){delete state.x;delete state.y;delete state.z;delete state.width;delete state.height;state.collapsed=false}await this.plugin.persistData()}));
    new Setting(this.containerEl).setName("Clear saved layout").addButton(button=>button.setButtonText("Clear").setWarning().onClick(()=>void this.plugin.clearPositions()));
  }
}
