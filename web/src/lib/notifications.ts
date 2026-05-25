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

function playSignalTone(): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    setTimeout(() => void ctx.close(), 300);
  } catch {
    /* ignore */
  }
}

export function showSignalNotification(title: string, body: string, tag: string): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  playSignalTone();

  const opts: NotificationOptions = {
    body,
    tag,
    icon: ICON,
    badge: ICON,
    requireInteraction: true,
    silent: false,
  };

  try {
    if (document.visibilityState === "hidden" || !document.hasFocus()) {
      new Notification(title, opts);
      return;
    }
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
