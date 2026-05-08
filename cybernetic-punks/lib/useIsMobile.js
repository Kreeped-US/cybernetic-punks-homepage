// lib/useIsMobile.js
// Shared responsive hook — use in any client component
// Default breakpoint: 640px (mobile)

import { useState, useEffect } from 'react';

export function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(function() {
    if (typeof window !== 'undefined') return window.innerWidth < breakpoint;
    return false;
  });

  useEffect(function() {
    var check = function() {
      setIsMobile(window.innerWidth < breakpoint);
    };
    check();
    window.addEventListener('resize', check);
    return function() {
      window.removeEventListener('resize', check);
    };
  }, [breakpoint]);

  return isMobile;
}