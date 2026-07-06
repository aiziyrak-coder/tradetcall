/**
 * GitHub pushsiz — faqat SSH: pull, build, OpenAI kalit, restart
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
const OPENAI_KEY = (process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || "").trim();

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
      stream.on("close", (code) => {
        if (code !== 0) reject(new Error(`${label} failed (${code}):\n${out.slice(-2000)}`));
        else resolve(out);
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
  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn
      .on("ready", resolve)
      .on("error", reject)
      .connect({ host: HOST, port: 22, username: USER, password: PASS, readyTimeout: 45000 });
  });
  console.log(`Ulandi: ${USER}@${HOST}`);

  const setupLocal = path.join(root, "deploy", "remote-setup.sh");
  const setupRemote = "/tmp/trade-remote-setup.sh";
  const setupLf = path.join(root, "deploy", ".remote-setup-lf.sh");
  fs.writeFileSync(setupLf, fs.readFileSync(setupLocal, "utf8").replace(/\r\n/g, "\n"));
  await upload(conn, setupLf, setupRemote);

  await exec(
    conn,
    `chmod +x ${setupRemote} && sed -i 's/\\r$//' ${setupRemote} && bash ${setupRemote}`,
    "Pull + build + restart"
  );

  if (OPENAI_KEY.startsWith("sk-")) {
    const esc = OPENAI_KEY.replace(/'/g, "'\\''");
    await exec(
      conn,
      `OPENAI_API_KEY='${esc}' node -e "
const fs=require('fs');
const p='/opt/trade/data/store.json';
let d={users:[],apiKey:'',translationCache:{}};
try{if(fs.existsSync(p))d=JSON.parse(fs.readFileSync(p,'utf8'));}catch(e){}
d.apiKey=process.env.OPENAI_API_KEY;
fs.mkdirSync('/opt/trade/data',{recursive:true});
fs.writeFileSync(p,JSON.stringify(d,null,2));
const envp='/opt/trade/.env';
let env=fs.existsSync(envp)?fs.readFileSync(envp,'utf8'):'';
for(const k of['OPENAI_API_KEY=','DEEPSEEK_API_KEY='])env=env.split('\\n').filter(l=>!l.startsWith(k)).join('\\n');
if(env&&!env.endsWith('\\n'))env+='\\n';
env+='OPENAI_API_KEY='+process.env.OPENAI_API_KEY+'\\n';
fs.writeFileSync(envp,env);
console.log('OpenAI kalit saqlandi');
" && systemctl restart trade-api`,
      "OpenAI API kalit"
    );
  }

  await exec(
    conn,
    "curl -sf -o /dev/null -w '%{http_code}' http://127.0.0.1:3070/api/health || echo fail",
    "Health"
  );

  conn.end();
  console.log("\nTayyor: https://trade.ziyrak.org");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
