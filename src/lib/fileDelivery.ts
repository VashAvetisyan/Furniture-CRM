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

// A bare Android WebView (no setDownloadListener wired up natively) silently
// swallows the `download` attribute click above — nothing happens, no error.
// Navigating the WebView itself to the blob URL doesn't rely on that hook at
// all; it's a plain page load, which every WebView has to support, and the
// Chromium-based system WebView renders PDFs inline once it gets there.
export function openFileInPlace(blob: Blob): void {
  window.location.href = URL.createObjectURL(blob);
}

// The Android APK's WebView can inject a native bridge object (via
// `webView.addJavascriptInterface(..., "Android")`) exposing `saveFile` /
// `shareFile` methods — this is the only reliable delivery path inside a
// bare WebView, since blob: URLs never pass through WebView's own
// DownloadListener at all. Absent in every other context (regular
// desktop/mobile browsers), so those keep using the Web Share / plain-
// download paths below untouched. The choice UI (Կիսվել/Ներբեռնել) stays
// identical either way — only which mechanism actually moves the bytes
// changes underneath it, so the APK experience matches the website's.
type AndroidBridge = {
  saveFile:   (base64Data: string, filename: string, mimeType: string) => void;
  shareFile?: (base64Data: string, filename: string, mimeType: string) => void;
};

function getAndroidBridge(): AndroidBridge | null {
  if (typeof window === 'undefined') return null;
  const bridge = (window as unknown as { Android?: AndroidBridge }).Android;
  return typeof bridge?.saveFile === 'function' ? bridge : null;
}

export function hasNativeBridge(): boolean {
  return getAndroidBridge() !== null;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror   = reject;
    reader.readAsDataURL(blob);
  });
}

export async function saveViaNativeBridge(blob: Blob, filename: string): Promise<boolean> {
  const bridge = getAndroidBridge();
  if (!bridge) return false;
  const base64 = await blobToBase64(blob);
  bridge.saveFile(base64, filename, blob.type || 'application/octet-stream');
  return true;
}

// Falls back to saveFile if the native side hasn't implemented shareFile yet
// — landing in Downloads is a reasonable substitute for a share sheet that
// doesn't exist, rather than doing nothing.
export async function shareViaNativeBridge(blob: Blob, filename: string): Promise<boolean> {
  const bridge = getAndroidBridge();
  if (!bridge) return false;
  const base64 = await blobToBase64(blob);
  (bridge.shareFile ?? bridge.saveFile)(base64, filename, blob.type || 'application/octet-stream');
  return true;
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
