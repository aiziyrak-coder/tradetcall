/**
 * SSH orqali serverga deploy (parol: DEPLOY_PASS env).
 * Boshqa nginx saytlariga tegmaydi — faqat trade*.ziyrak.org qo'shiladi.
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Client } from "ssh2";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOST = process.env.DEPLOY_HOST || "167.71.53.238";
const USER = process.env.DEPLOY_USER || "root";
const PASS = process.env.DEPLOY_PASS || "";

if (!PASS) {
  console.error("DEPLOY_PASS o'rnatilmagan");
  process.exit(1);
}

function exec(conn, cmd, label) {
  return new Promise((resolve, reject) => {
    console.log(`\n>>> ${label}\n$ ${cmd.slice(0, 120)}${cmd.length > 120 ? "…" : ""}`);
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      stream.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`${label} failed (${code}):\n${out}`));
        } else resolve(out);
      });
      stream.on("data", (d) => {
        const s = d.toString();
        out += s;
        process.stdout.write(s);
      });
      stream.stderr.on("data", (d) => process.stderr.write(d.toString()));
    });
  });
}

function upload(conn, local, remote) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const rs = fs.createReadStream(local);
      const ws = sftp.createWriteStream(remote);
      ws.on("close", resolve);
      ws.on("error", reject);
      rs.pipe(ws);
    });
  });
}

async function main() {
  console.log("Git push...");
  const push = spawnSync("git", ["push", "origin", "main"], {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });
  if (push.status !== 0) {
    console.warn("git push xato — serverda eski commit bo'lishi mumkin");
  }

  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn
      .on("ready", resolve)
      .on("error", reject)
      .connect({ host: HOST, port: 22, username: USER, password: PASS, readyTimeout: 30000 });
  });

  console.log(`Ulandi: ${USER}@${HOST}`);

  await exec(
    conn,
    "mkdir -p /opt/trade && ls /etc/nginx/sites-enabled/ 2>/dev/null | head -15",
    "Server holati"
  );

  const setupLocal = path.join(root, "deploy", "remote-setup.sh");
  const setupRemote = "/tmp/trade-remote-setup.sh";
  await upload(conn, setupLocal, setupRemote);
  await exec(conn, `chmod +x ${setupRemote} && bash ${setupRemote}`, "Deploy skript");

  conn.end();
  console.log("\nTayyor: https://trade.ziyrak.org | https://tradeapi.ziyrak.org");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
