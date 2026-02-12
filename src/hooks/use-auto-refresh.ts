"use client";

import { useState, useEffect, useCallback } from "react";

export function useAutoRefresh(intervalMs: number = 600000) {
  // 10 min default
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [countdown, setCountdown] = useState(intervalMs / 1000);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);

  const refresh = useCallback(() => {
    setLastUpdated(new Date());
    setCountdown(intervalMs / 1000);
    // Trigger re-fetch de todos los datos
    window.dispatchEvent(new Event("dashboard-refresh"));
  }, [intervalMs]);

  useEffect(() => {
    if (!isAutoRefresh) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          refresh();
          return intervalMs / 1000;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isAutoRefresh, intervalMs, refresh]);

  return { lastUpdated, countdown, isAutoRefresh, setIsAutoRefresh, refresh };
}
