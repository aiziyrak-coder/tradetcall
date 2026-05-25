import https from "https";

export function checkInternet(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = https.get(
      "https://www.google.com/generate_204",
      { timeout: 5000 },
      (res) => {
        resolve(res.statusCode === 204 || (res.statusCode ?? 0) < 400);
        res.resume();
      }
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}
