"use client";

import { useEffect, useState } from "react";

/**
 * Deep-links from push notifications (Phase D): /goals/:id?task=<taskId>
 * scrolls to the referenced task row and highlights it briefly.
 */
export function TaskDeepLink() {
  const [taskId, setTaskId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTaskId(params.get("task"));
  }, []);

  useEffect(() => {
    if (!taskId) return;
    const el = document.getElementById(`task-${taskId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-brand-400");
    const timer = setTimeout(() => {
      el.classList.remove("ring-2", "ring-brand-400");
    }, 3000);
    return () => clearTimeout(timer);
  }, [taskId]);

  return null;
}
