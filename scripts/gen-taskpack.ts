import { writeFileSync } from "node:fs";
import { analyzeRepo, buildTaskPack } from "../lib/engine";

async function main() {
  const result = await analyzeRepo({
    fixtureName: "demo-api-client",
    changeBrief: "Add rate-limit feedback to the API client",
  });
  const zip = await buildTaskPack(result);
  writeFileSync("task-pack.zip", zip);
  console.log("wrote task-pack.zip", zip.length, "bytes");
}
main();
