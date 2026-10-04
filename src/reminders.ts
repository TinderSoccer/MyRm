import type { Reminder } from './data';
import { todayISO } from './format';

export const DAY_FULL = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** Mon=0..Sun=6. Older saved reminders only kept the "Lun · Mié" label, so read the days back from it. */
export const daysOf = (r: Reminder) => r.days ?? r.sub.split(' · ').map(x => DAY_FULL.indexOf(x)).filter(i => i >= 0);

export type NotifyState = 'unsupported' | NotificationPermission;

export const notifyState = (): NotifyState => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);

export async function askNotify(): Promise<NotifyState> {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try { return await Notification.requestPermission(); } catch { return Notification.permission; }
}

async function notify(r: Reminder) {
  const opts = { body: 'Hora de ir al box. Un empujoncito, nunca un sermón.', icon: './icon-192.png', badge: './icon-192.png', tag: `rem-${r.id}` };
  try {
    // Android only shows notifications through a service worker.
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) { await reg.showNotification(r.title, opts); return; }
    new Notification(r.title, opts);
  } catch { /* blocked or unsupported: the reminder simply stays silent */ }
}

const FIRED_KEY = 'myrm.fired';
// A tab in the background can be throttled for a while; still fire if we wake up within this window.
const LATE_WINDOW_MIN = 20;

/** Fires every reminder due right now (once per day each). Works while the app is open or in the background. */
export function fireDueReminders(reminders: Reminder[]) {
  if (notifyState() !== 'granted') return;
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = todayISO();
  let fired: Record<string, string> = {};
  try { fired = JSON.parse(localStorage.getItem(FIRED_KEY) || '{}'); } catch { /* private mode */ }
  let changed = false;
  for (const r of reminders) {
    if (!r.on || !daysOf(r).includes(day) || fired[r.id] === today) continue;
    const [h, m = 0] = r.time.split(':').map(Number);
    const late = nowMin - (h * 60 + m);
    if (late < 0 || late > LATE_WINDOW_MIN) continue;
    fired[r.id] = today;
    changed = true;
    notify(r);
  }
  if (changed) try { localStorage.setItem(FIRED_KEY, JSON.stringify(fired)); } catch { /* storage blocked */ }
}
