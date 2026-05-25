import { Client } from "ssh2";

const PASS = process.env.DEPLOY_PASS || "";
const conn = new Client();
conn.on("ready", () => {
  conn.exec("ss -tlnp | grep -E '3050|8050|9030|9031|3040|8040' || echo 'ports free'", (e, s) => {
    s.on("data", (d) => process.stdout.write(d));
    s.on("close", () => conn.end());
  });
}).connect({ host: "167.71.53.238", username: "root", password: PASS });
