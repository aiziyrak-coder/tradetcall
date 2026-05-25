import fs from "fs";

const files = [
  "E:/XAUUSD/desktop/src/screens/AuthScreen.tsx",
  "E:/XAUUSD/desktop/src/screens/AdminScreen.tsx",
];

for (const fp of files) {
  let s = fs.readFileSync(fp, "utf8");
  s = s.split('import { api } from "../lib/api";\n').join("");
  s = s.split('import { api } from "../lib/api";\r\n').join("");
  s = s.replaceAll("api.auth", "window.electronAPI.auth");
  s = s.replaceAll("api.admin", "window.electronAPI.admin");
  fs.writeFileSync(fp, s);
  console.log("fixed", fp);
}
