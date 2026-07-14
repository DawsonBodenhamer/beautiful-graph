import test from "node:test";
import assert from "node:assert/strict";
import { deriveGraphRelationships } from "../src/graph-relationships.ts";

const edge=(result:ReturnType<typeof deriveGraphRelationships>,left:string,right:string)=>result.edges.find(candidate=>candidate.source===left&&candidate.target===right);

test("index links are parent edges and shared children are siblings",()=>{
  const paths=["wiki/clients/index.md","wiki/clients/a.md","wiki/clients/b.md","wiki/clients/c.md"],result=deriveGraphRelationships(paths,[
    {source:"wiki/clients/index.md",target:"wiki/clients/a.md"},
    {source:"wiki/clients/index.md",target:"wiki/clients/b.md"},
    {source:"wiki/clients/a.md",target:"wiki/clients/b.md"},
    {source:"wiki/clients/c.md",target:"wiki/clients/a.md"},
  ]);
  assert.equal(edge(result,"wiki/clients/a.md","wiki/clients/index.md")?.relationship,"parent");
  assert.equal(edge(result,"wiki/clients/a.md","wiki/clients/b.md")?.relationship,"sibling");
  assert.equal(edge(result,"wiki/clients/a.md","wiki/clients/c.md")?.relationship,"cross");
});

test("directed evidence survives canonical deduplication",()=>{
  const result=deriveGraphRelationships(["a.md","index.md"],[{source:"index.md",target:"a.md"},{source:"a.md",target:"index.md"}]),found=edge(result,"a.md","index.md");
  assert.equal(result.edges.length,1);
  assert.deepEqual(found,{source:"a.md",target:"index.md",forward:true,reverse:true,relationship:"parent"});
});

test("mutual index links use folder ancestry or sibling folders",()=>{
  const paths=["wiki/index.md","wiki/projects/index.md","wiki/a/index.md","wiki/b/index.md"],links=[
    {source:"wiki/index.md",target:"wiki/projects/index.md"},{source:"wiki/projects/index.md",target:"wiki/index.md"},
    {source:"wiki/a/index.md",target:"wiki/b/index.md"},{source:"wiki/b/index.md",target:"wiki/a/index.md"},
  ],result=deriveGraphRelationships(paths,links);
  assert.equal(edge(result,"wiki/index.md","wiki/projects/index.md")?.relationship,"parent");
  assert.equal(edge(result,"wiki/a/index.md","wiki/b/index.md")?.relationship,"sibling");
  assert.equal(result.parentsByNode.get("wiki/projects/index.md")?.has("wiki/index.md"),true);
});

test("family selection prefers the deepest ancestral index and has a folder fallback",()=>{
  const paths=["wiki/index.md","wiki/clients/index.md","wiki/clients/a.md","wiki/orphan.md"],result=deriveGraphRelationships(paths,[
    {source:"wiki/index.md",target:"wiki/clients/a.md"},
    {source:"wiki/clients/index.md",target:"wiki/clients/a.md"},
  ]);
  assert.equal(result.familyByNode.get("wiki/clients/a.md"),"wiki/clients/index.md");
  assert.equal(result.familyByNode.get("wiki/orphan.md"),"folder:wiki");
});
