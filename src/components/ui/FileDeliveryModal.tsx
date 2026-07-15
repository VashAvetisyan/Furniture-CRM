'use client';

import { useEffect, useState } from 'react';
import { isMobileDevice, triggerBrowserDownload, openFileInPlace, shareFile } from '@/lib/fileDelivery';

interface FileDeliveryModalProps {
  blob:     Blob;
  filename: string;
  title?:   string;
  onClose:  () => void;
}

// Desktop: just download, no prompt needed — closes itself immediately.
// Phone / Android APK: ask whether to save the file or hand it to the native
// share sheet, since "Downloads" isn't always where a WebView user will look.
export default function FileDeliveryModal({ blob, filename, title, onClose }: FileDeliveryModalProps) {
  const [sharing, setSharing] = useState(false);
  const mobile = isMobileDevice();

  useEffect(() => {
    if (!mobile) {
      triggerBrowserDownload(blob, filename);
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mobile) return null;

  async function handleShare() {
    setSharing(true);
    const ok = await shareFile(blob, filename, title);
    setSharing(false);
    if (ok) onClose();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl p-6 w-[calc(100%-2rem)] max-w-xs flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <p className="text-base font-bold text-dark text-center">{filename}</p>
          <p className="text-sm text-text-muted text-center mt-1">Ինչպե՞ս ուզում ես ստանալ ֆայլը</p>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={handleShare}
            disabled={sharing}
            className="w-full px-4 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {sharing ? '...' : 'Կիսվել'}
          </button>
          <button
            onClick={() => { openFileInPlace(blob); onClose(); }}
            className="w-full px-4 py-2.5 text-sm font-semibold rounded-xl border border-crm-border text-dark hover:bg-gray-50 transition-colors"
          >
            Ներբեռնել
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 text-sm font-medium text-text-muted hover:text-dark transition-colors"
          >
            Չեղարկել
          </button>
        </div>
      </div>
    </div>
  );
}
