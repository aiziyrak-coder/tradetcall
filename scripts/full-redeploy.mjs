import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Client } from "ssh2";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PASS = process.env.DEPLOY_PASS || "";

if (!PASS) {
  console.error("DEPLOY_PASS kerak");
  process.exit(1);
}

function exec(conn, cmd, label) {
  return new Promise((resolve, reject) => {
    console.log(`\n>>> ${label}`);
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      stream.on("data", (d) => {
        const s = d.toString();
        out += s;
        process.stdout.write(s);
      });
      stream.stderr.on("data", (d) => process.stderr.write(d.toString()));
      stream.on("close", (code) => (code !== 0 ? reject(new Error(`${label} (${code})`)) : resolve(out)));
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
  console.log("1) Git push...");
  spawnSync("git", ["add", "-A"], { cwd: root, stdio: "inherit", shell: true });
  spawnSync("git", ["commit", "-m", "Fix login: API URL in build, cookies, env redeploy"], {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });
  const push = spawnSync("git", ["push", "origin", "main"], { cwd: root, stdio: "inherit", shell: true });
  if (push.status !== 0) console.warn("git push ogohlantirish");

  const conn = new Client();
  await new Promise((res, rej) =>
    conn.on("ready", res).on("error", rej).connect({
      host: process.env.DEPLOY_HOST || "167.71.53.238",
      username: "root",
      password: PASS,
      readyTimeout: 30000,
    })
  );

  const setupLf = path.join(root, "deploy", ".remote-setup-lf.sh");
  fs.writeFileSync(
    setupLf,
    fs.readFileSync(path.join(root, "deploy", "remote-setup.sh"), "utf8").replace(/\r\n/g, "\n")
  );
  const diagLf = path.join(root, "scripts", ".server-diagnose-lf.sh");
  fs.writeFileSync(
    diagLf,
    fs.readFileSync(path.join(root, "scripts", "server-diagnose.sh"), "utf8").replace(/\r\n/g, "\n")
  );

  await upload(conn, setupLf, "/tmp/trade-setup.sh");
  await exec(conn, "chmod +x /tmp/trade-setup.sh && bash /tmp/trade-setup.sh", "Full redeploy");

  await upload(conn, diagLf, "/tmp/trade-diag.sh");
  await exec(conn, "chmod +x /tmp/trade-diag.sh && bash /tmp/trade-diag.sh", "Diagnostika");

  await exec(
    conn,
    `curl -sS -X POST https://tradeapi.ziyrak.org/api/auth/login -H 'Content-Type: application/json' -d '{"username":"lynxos","password":"3888"}'`,
    "HTTPS login test"
  );

  conn.end();
  console.log("\nTayyor: https://trade.ziyrak.org");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
