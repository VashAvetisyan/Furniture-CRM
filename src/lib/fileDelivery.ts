// Desktop: a plain browser download is the obvious, expected behavior.
// Phone / the Android APK wrapper: the user usually wants to pick between
// saving the file and sharing it straight to another app (WhatsApp, Drive,
// email...), since "Downloads" isn't always somewhere they'll think to look
// inside a WebView. Detect which situation we're in so the caller can decide
// whether to just download or offer a choice.
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type ShareCapableNavigator = Navigator & {
  share?:    (data: ShareData) => Promise<void>;
  canShare?: (data: ShareData) => boolean;
};

// Returns true if the file was handed off to the native share sheet (or the
// user dismissed it, which isn't a failure) — false if sharing isn't usable
// here at all, so the caller should fall back to a plain download.
export async function shareFile(blob: Blob, filename: string, title?: string): Promise<boolean> {
  const nav = navigator as ShareCapableNavigator;
  if (!nav.share || !nav.canShare) return false;
  try {
    const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
    if (!nav.canShare({ files: [file] })) return false;
    await nav.share({ files: [file], title: title ?? filename });
    return true;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return true; // user closed the sheet — handled, not a failure
    return false;
  }
}
