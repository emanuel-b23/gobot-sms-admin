"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function KillSwitchButton({
  shopDomain,
  adminDisabled,
}: {
  shopDomain: string;
  adminDisabled: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleToggle = async () => {
    const action = adminDisabled ? "enable" : "disable";
    let reason: string | null = null;

    if (action === "disable") {
      reason = prompt(
        `Disable Gobot for ${shopDomain}?\n\nThe merchant will see this message in their app:`,
        "Your Gobot SMS app has been disabled. Please contact support to restore service.",
      );
      if (reason === null) return; // cancelled
    } else {
      if (!confirm(`Re-enable Gobot for ${shopDomain}?`)) return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/kill-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopDomain, action, reason }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Failed: ${err.error || res.statusText}`);
        setLoading(false);
        return;
      }
      router.refresh();
    } catch (e) {
      alert(`Error: ${e instanceof Error ? e.message : "Unknown"}`);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`px-4 py-2 text-sm font-medium rounded-md ${
        adminDisabled
          ? "bg-green-600 text-white hover:bg-green-700"
          : "bg-red-600 text-white hover:bg-red-700"
      } disabled:opacity-50`}
    >
      {loading ? "Working..." : adminDisabled ? "Re-enable App" : "Disable App"}
    </button>
  );
}
