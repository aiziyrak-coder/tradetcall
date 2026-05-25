import { Client } from "ssh2";

const PASS = process.env.DEPLOY_PASS || "";
const cmd = `
cd /opt/trade
git pull origin main
sed -i 's/PORT=3010/PORT=3020/g; s/127.0.0.1:8010/127.0.0.1:8020/g' .env
cp deploy/nginx-tradeapi.ziyrak.org.conf /etc/nginx/sites-available/tradeapi.ziyrak.org
cp deploy/systemd/trade-django.service /etc/systemd/system/
systemctl daemon-reload
systemctl restart trade-django
sleep 2
systemctl restart trade-api
nginx -t && systemctl reload nginx
echo "--- health ---"
curl -sS http://127.0.0.1:3020/api/health
`;

const conn = new Client();
conn
  .on("ready", () => {
    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      stream.on("data", (d) => process.stdout.write(d));
      stream.stderr.on("data", (d) => process.stderr.write(d));
      stream.on("close", () => conn.end());
    });
  })
  .connect({ host: "167.71.53.238", username: "root", password: PASS });
