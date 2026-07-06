/**
 * trade.tcall.uz deploy — SSH orqali, boshqa saytlarga tegmaydi
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Client } from "ssh2";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOST = process.env.DEPLOY_HOST || "164.90.186.193";
const USER = process.env.DEPLOY_USER || "root";
const PASS = process.env.DEPLOY_PASS || "";

function readLocalEnvKey() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return "";
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^(?:OPENAI_API_KEY|DEEPSEEK_API_KEY)=(.+)$/);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return "";
}

const OPENAI_KEY = (process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || readLocalEnvKey()).trim();

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
        if (code !== 0) reject(new Error(`${label} failed (${code}):\n${out.slice(-3000)}`));
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
      .connect({ host: HOST, port: 22, username: USER, password: PASS, readyTimeout: 60000 });
  });
  console.log(`Ulandi: ${USER}@${HOST}`);

  await exec(conn, "ss -tlnp | grep -E ':3070|:8070' || true; ls /etc/nginx/sites-enabled/ 2>/dev/null | head -20", "Server holati");

  const setupLocal = path.join(root, "deploy", "remote-setup-tcall.sh");
  const setupRemote = "/tmp/tradetcall-remote-setup.sh";
  const setupLf = path.join(root, "deploy", ".remote-setup-tcall-lf.sh");
  fs.writeFileSync(setupLf, fs.readFileSync(setupLocal, "utf8").replace(/\r\n/g, "\n"));
  await upload(conn, setupLf, setupRemote);

  await exec(
    conn,
    `chmod +x ${setupRemote} && sed -i 's/\\r$//' ${setupRemote} && bash ${setupRemote}`,
    "Clone + build + deploy"
  );

  if (OPENAI_KEY.startsWith("sk-")) {
    const esc = OPENAI_KEY.replace(/'/g, "'\\''");
    await exec(
      conn,
      `OPENAI_API_KEY='${esc}' node -e "
const fs=require('fs');
const p='/opt/tradetcall/data/store.json';
let d={users:[],apiKey:'',translationCache:{}};
try{if(fs.existsSync(p))d=JSON.parse(fs.readFileSync(p,'utf8'));}catch(e){}
d.apiKey=process.env.OPENAI_API_KEY;
fs.mkdirSync('/opt/tradetcall/data',{recursive:true});
fs.writeFileSync(p,JSON.stringify(d,null,2));
const envp='/opt/tradetcall/.env';
let env=fs.existsSync(envp)?fs.readFileSync(envp,'utf8'):'';
for(const k of['OPENAI_API_KEY=','DEEPSEEK_API_KEY='])env=env.split('\\n').filter(l=>!l.startsWith(k)).join('\\n');
if(env&&!env.endsWith('\\n'))env+='\\n';
env+='OPENAI_API_KEY='+process.env.OPENAI_API_KEY+'\\n';
fs.writeFileSync(envp,env);
console.log('OpenAI kalit saqlandi');
" && systemctl restart tradetcall-api`,
      "OpenAI API kalit"
    );
  }

  await exec(
    conn,
    "curl -sf http://127.0.0.1:3070/api/health; echo; systemctl is-active tradetcall-api tradetcall-django nginx",
    "Health tekshiruv"
  );

  conn.end();
  console.log("\n✓ Tayyor:");
  console.log("  Frontend: https://trade.tcall.uz");
  console.log("  Backend:  https://tradeapi.tcall.uz");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
