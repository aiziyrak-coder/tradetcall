import * as esbuild from "esbuild";
import { mkdirSync } from "fs";

mkdirSync("dist-electron", { recursive: true });

const opts = {
  bundle: true,
  platform: "node",
  target: "node20",
  external: ["electron"],
  sourcemap: true,
};

await esbuild.build({
  ...opts,
  entryPoints: ["electron/main.ts"],
  outfile: "dist-electron/main.js",
});

await esbuild.build({
  ...opts,
  entryPoints: ["electron/preload.ts"],
  outfile: "dist-electron/preload.js",
  format: "cjs",
});

console.log("Electron built");
