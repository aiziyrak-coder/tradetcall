import * as esbuild from "esbuild";
import { mkdirSync } from "fs";

mkdirSync("dist-server", { recursive: true });

await esbuild.build({
  entryPoints: ["server/index.ts"],
  outfile: "dist-server/index.js",
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  packages: "external",
  sourcemap: true,
});

console.log("Server built → dist-server/index.js");
