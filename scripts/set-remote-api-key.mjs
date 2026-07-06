/**
 * Serverda OpenAI kalitini saqlash (store.json + .env).
 * Ishlatish: OPENAI_API_KEY=sk-... DEPLOY_PASS=... node scripts/set-remote-api-key.mjs
 */
import { Client } from "ssh2";

const HOST = process.env.DEPLOY_HOST || "167.71.53.238";
const USER = process.env.DEPLOY_USER || "root";
const PASS = process.env.DEPLOY_PASS || "";
const KEY = (process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || "").trim();

if (!PASS) {
  console.error("DEPLOY_PASS kerak");
  process.exit(1);
}
if (!KEY.startsWith("sk-")) {
  console.error("OPENAI_API_KEY (sk-...) kerak");
  process.exit(1);
}

function exec(conn, cmd, label) {
  return new Promise((resolve, reject) => {
    console.log(`>>> ${label}`);
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let errOut = "";
      stream.on("close", (code) =>
        code === 0 ? resolve() : reject(new Error(`${label} failed (${code}):\n${errOut}`))
      );
      stream.on("data", (d) => process.stdout.write(d));
      stream.stderr.on("data", (d) => {
        errOut += d.toString();
        process.stderr.write(d);
      });
    });
  });
}

const conn = new Client();
conn
  .on("ready", async () => {
    try {
      const cmd = `OPENAI_API_KEY='${KEY.replace(/'/g, "'\\''")}' node -e "
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
console.log('OpenAI kalit saqlandi,',d.apiKey.length,'belgi');
"`;
      await exec(conn, cmd, "Kalit saqlash");
      await exec(
        conn,
        "systemctl restart trade-api 2>/dev/null; systemctl restart xauusd-trade 2>/dev/null; systemctl list-units 'trade*' --no-pager | head -5",
        "Restart"
      );
      console.log("Tayyor — https://trade.ziyrak.org da YANGI PROGNOZ");
      conn.end();
    } catch (e) {
      console.error(e.message || e);
      conn.end();
      process.exit(1);
    }
  })
  .connect({ host: HOST, port: 22, username: USER, password: PASS, readyTimeout: 30000 });
