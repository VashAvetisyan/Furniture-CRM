'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function TopProgressBar() {
  const pathname          = usePathname();
  const [width, setWidth]   = useState(0);
  const [visible, setVisible] = useState(false);
  const prevPath  = useRef(pathname);
  const timers    = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearAll() { timers.current.forEach(clearTimeout); timers.current = []; }

  function startBar() {
    clearAll();
    setVisible(true);
    setWidth(0);
    timers.current.push(setTimeout(() => setWidth(30),  20));
    timers.current.push(setTimeout(() => setWidth(65),  200));
    timers.current.push(setTimeout(() => setWidth(80),  600));
  }

  function finishBar() {
    clearAll();
    setWidth(100);
    timers.current.push(setTimeout(() => setVisible(false), 300));
    timers.current.push(setTimeout(() => setWidth(0), 350));
  }

  // Start bar immediately on internal link click
  useEffect(() => {
    function onLinkClick(e: MouseEvent) {
      const anchor = (e.target as Element).closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || !href.startsWith('/') || href === pathname) return;
      startBar();
    }
    document.addEventListener('mousedown', onLinkClick);
    return () => document.removeEventListener('mousedown', onLinkClick);
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Finish bar when navigation completes
  useEffect(() => {
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;
    finishBar();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={`fixed top-0 left-0 z-[9999] h-[3px] bg-primary shadow-[0_0_8px_rgba(67,97,238,0.6)] transition-all ease-out pointer-events-none ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        width:              `${width}%`,
        transitionDuration: width === 0 ? '0ms' : width === 100 ? '200ms' : '400ms',
      }}
    />
  );
}
