// lib/useIsMobile.js
// Shared responsive hook — use in any client component
// Default breakpoint: 640px (mobile), 1024px (tablet)

import { useState, useEffect } from 'react';

export function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false);

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

export function useIsTablet() {
  const [isTablet, setIsTablet] = useState(false);

  useEffect(function() {
    var check = function() {
      var w = window.innerWidth;
      setIsTablet(w >= 640 && w < 1024);
    };
    check();
    window.addEventListener('resize', check);
    return function() {
      window.removeEventListener('resize', check);
    };
  }, []);

  return isTablet;
}