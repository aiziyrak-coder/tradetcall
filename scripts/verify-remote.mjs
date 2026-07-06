import { Client } from "ssh2";
const PASS = process.env.DEPLOY_PASS || "";
const conn = new Client();
conn
  .on("ready", () => {
    conn.exec(
      `grep OPENAI_API_KEY= /opt/trade/.env | cut -c1-28
node -e "const d=require('/opt/trade/data/store.json');console.log('store len',d.apiKey.length)"
systemctl is-active trade-api trade-django
curl -s -o /dev/null -w "health:%{http_code}\\n" https://tradeapi.ziyrak.org/api/health`,
      (err, s) => {
        s.on("data", (d) => process.stdout.write(d));
        s.on("close", () => conn.end());
      }
    );
  })
  .connect({ host: "167.71.53.238", username: "root", password: PASS });
