"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";

/** Promotes a draft plan to active (user action). */
export function AcceptPlanButton({ planId }: { planId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAccept() {
    setError(null);
    setLoading(true);
    try {
      await api.acceptPlan(planId);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not accept the plan",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button size="sm" loading={loading} onClick={onAccept}>
        Accept plan
      </Button>
      {error ? (
        <span className="text-sm text-red-600">{error}</span>
      ) : null}
    </div>
  );
}
