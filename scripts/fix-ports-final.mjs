import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Client } from "ssh2";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PASS = process.env.DEPLOY_PASS || "";

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      stream.on("data", (d) => process.stdout.write(d));
      stream.stderr.on("data", (d) => process.stderr.write(d));
      stream.on("close", (code) => (code ? reject(new Error(`exit ${code}`)) : resolve()));
    });
  });
}

function upload(conn, local, remote) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      fs.createReadStream(local).pipe(sftp.createWriteStream(remote)).on("close", resolve).on("error", reject);
    });
  });
}

const conn = new Client();
conn.on("ready", async () => {
  const setup = fs
    .readFileSync(path.join(root, "deploy/remote-setup.sh"), "utf8")
    .replace(/\r\n/g, "\n");
  fs.writeFileSync(path.join(root, "deploy/.setup-lf.sh"), setup);
  await upload(conn, path.join(root, "deploy/.setup-lf.sh"), "/tmp/trade-setup.sh");
  await exec(conn, "chmod +x /tmp/trade-setup.sh && bash /tmp/trade-setup.sh");
  await exec(
    conn,
    `curl -sS http://127.0.0.1:8070/api/auth/login/ -X POST -H 'Content-Type: application/json' -d '{"username":"lynxos","password":"3888"}'
echo ''
curl -sS http://127.0.0.1:3070/api/auth/login -X POST -H 'Content-Type: application/json' -d '{"username":"lynxos","password":"3888"}'
echo ''
curl -sS https://tradeapi.ziyrak.org/api/auth/login -X POST -H 'Content-Type: application/json' -d '{"username":"lynxos","password":"3888"}'`
  );
  conn.end();
  console.log("\nOK");
}).connect({ host: "167.71.53.238", username: "root", password: PASS });
