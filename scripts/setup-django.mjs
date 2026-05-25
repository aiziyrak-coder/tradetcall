import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const djangoDir = path.join(root, "django_auth");
const payloadDir = path.join(root, "scripts", "django_payload");

function copyPayload() {
  if (!fs.existsSync(payloadDir)) {
    console.error("scripts/django_payload topilmadi");
    process.exit(1);
  }
  if (!fs.existsSync(path.join(djangoDir, "manage.py"))) {
    fs.mkdirSync(djangoDir, { recursive: true });
    fs.cpSync(payloadDir, djangoDir, { recursive: true });
  }
}

copyPayload();
const py = process.platform === "win32" ? "python" : "python3";
const env = { ...process.env, DATA_DIR: process.env.DATA_DIR || path.join(root, "data") };

function run(args) {
  const r = spawnSync(py, args, { cwd: djangoDir, stdio: "inherit", env });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log("Django: makemigrations...");
run(["manage.py", "makemigrations", "users", "--noinput"]);

console.log("Django: migrate...");
run(["manage.py", "migrate", "--noinput"]);

console.log("Django: seed Lynxos / Ahror...");
run(["manage.py", "seed_trade_users"]);

console.log("Tayyor. Django Admin: http://127.0.0.1:8001/admin/");
