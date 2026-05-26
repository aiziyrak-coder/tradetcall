const ICON = "/icon-192.png";

export type NotifyPermission = NotificationPermission | "unsupported";

export function getNotifyPermission(): NotifyPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/** Bir marta ruxsat — login yoki sozlamalardan */
export async function requestNotificationPermission(): Promise<NotifyPermission> {
  if (getNotifyPermission() === "unsupported") return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Yangi BUY/SELL — 3 marta qisqa signal tovushi */
export async function playTripleSignalAlert(action: "BUY" | "SELL"): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const ctx = new AudioContext();
    const freqs = action === "BUY" ? [880, 1040, 1240] : [620, 520, 440];
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freqs[i];
      const t0 = ctx.currentTime;
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.exponentialRampToValueAtTime(0.14, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.11);
      osc.start(t0);
      osc.stop(t0 + 0.12);
      if (i < 2) await sleep(140);
    }
    setTimeout(() => void ctx.close(), 400);
  } catch {
    /* brauzer ovozni bloklagan bo'lishi mumkin */
  }
}

export function showSignalNotification(title: string, body: string, tag: string): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const opts: NotificationOptions = {
    body,
    tag,
    icon: ICON,
    badge: ICON,
    requireInteraction: true,
    silent: true,
  };

  try {
    new Notification(title, opts);
  } catch {
    /* Safari eski versiyalar */
  }

  if (document.visibilityState === "hidden") {
    const prev = document.title;
    let n = 0;
    const blink = setInterval(() => {
      document.title = n % 2 === 0 ? `🔔 ${title}` : prev;
      n += 1;
      if (n > 6) {
        document.title = prev;
        clearInterval(blink);
      }
    }, 600);
  }
}
