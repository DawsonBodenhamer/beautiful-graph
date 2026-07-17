import {copyFileSync,existsSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {join} from "node:path";
import process from "node:process";

const root=process.cwd();
const localCargo=join(root,".tooling","cargo","bin",process.platform==="win32"?"cargo.exe":"cargo");
const cargo=process.env.CARGO||process.env.CARGO_HOME&&join(process.env.CARGO_HOME,"bin",process.platform==="win32"?"cargo.exe":"cargo")||existsSync(localCargo)&&localCargo||"cargo";
const env={...process.env};if(cargo===localCargo){env.CARGO_HOME=env.CARGO_HOME||join(root,".tooling","cargo");env.RUSTUP_HOME=env.RUSTUP_HOME||join(root,".tooling","rustup")}
const result=spawnSync(cargo,["build","--locked","--release","--target","wasm32-unknown-unknown","-p","graph-sim"],{cwd:root,stdio:"inherit",env});
if(result.error)throw result.error;
if(result.status!==0)process.exit(result.status??1);
copyFileSync(join(root,"target","wasm32-unknown-unknown","release","graph_sim.wasm"),join(root,"graph-sim.wasm"));
