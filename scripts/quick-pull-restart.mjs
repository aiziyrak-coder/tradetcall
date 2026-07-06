import { Client } from "ssh2";

const HOST = process.env.DEPLOY_HOST || "164.90.186.193";
const USER = process.env.DEPLOY_USER || "root";
const PASS = process.env.DEPLOY_PASS || "";

if (!PASS) {
  console.error("DEPLOY_PASS kerak");
  process.exit(1);
}

const cmd = `
set -e
cd /opt/tradetcall
git pull origin main
export DATA_DIR=/opt/tradetcall/data
cd django_auth
../venv/bin/python manage.py migrate --noinput
../venv/bin/python manage.py seed_trade_users
systemctl restart tradetcall-django
sleep 2
systemctl restart tradetcall-api
sleep 4
curl -sS http://127.0.0.1:3070/api/health || (systemctl status tradetcall-api --no-pager; journalctl -u tradetcall-api -n 20 --no-pager)
echo
curl -sS -X POST http://127.0.0.1:8070/api/auth/login/ \\
  -H 'Content-Type: application/json' \\
  -d '{"username":"javlon","password":"123123"}'
echo
systemctl is-active tradetcall-django tradetcall-api
`;

const conn = new Client();
conn
  .on("ready", () => {
    conn.exec(cmd, (err, stream) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      stream.on("close", (code) => {
        conn.end();
        process.exit(code || 0);
      });
      stream.on("data", (d) => process.stdout.write(d));
      stream.stderr.on("data", (d) => process.stderr.write(d));
    });
  })
  .on("error", (e) => {
    console.error(e.message);
    process.exit(1);
  })
  .connect({ host: HOST, port: 22, username: USER, password: PASS, readyTimeout: 60000 });
