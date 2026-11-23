import { existsSync, unlinkSync } from "node:fs";

const generatedDevVars = new URL("../dist/worker/.dev.vars", import.meta.url);

if (existsSync(generatedDevVars)) {
  unlinkSync(generatedDevVars);
  console.log("Removed local Worker secrets from the build output.");
}
