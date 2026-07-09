export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.permission;
}

export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return Promise.resolve('denied');
  return Notification.requestPermission();
}

// Fires only when the tab is hidden/unfocused — while the user is looking at
// the app the in-app toast is enough, no need to double up with an OS popup.
export function showBrowserNotification(title: string, body?: string) {
  if (!notificationsSupported()) return;
  if (Notification.permission !== 'granted') return;
  if (typeof document !== 'undefined' && !document.hidden && document.hasFocus()) return;

  try {
    const n = new Notification(title, { body });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    // Some browsers (mobile Safari, etc.) throw on `new Notification(...)` — ignore.
  }
}
