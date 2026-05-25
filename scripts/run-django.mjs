import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

import fs from "fs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const djangoDir = path.join(root, "django_auth");
const payloadDir = path.join(root, "scripts", "django_payload");
if (!fs.existsSync(path.join(djangoDir, "manage.py")) && fs.existsSync(payloadDir)) {
  fs.cpSync(payloadDir, djangoDir, { recursive: true });
}
const py = process.platform === "win32" ? "python" : "python3";

const child = spawn(py, ["manage.py", "runserver", "8001", "--noreload"], {
  cwd: djangoDir,
  stdio: "inherit",
  env: { ...process.env, DATA_DIR: process.env.DATA_DIR || path.join(root, "data") },
});

child.on("exit", (code) => process.exit(code ?? 0));
