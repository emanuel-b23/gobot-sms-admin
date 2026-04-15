"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function KillSwitchButton({
  shopDomain,
  isActive,
}: {
  shopDomain: string;
  isActive: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleToggle = async () => {
    const action = isActive ? "disable" : "enable";
    const confirmMsg = isActive
      ? `Disable the Gobot widget for ${shopDomain}? The merchant will no longer collect SMS opt-ins until you re-enable it.`
      : `Enable the Gobot widget for ${shopDomain}?`;

    if (!confirm(confirmMsg)) return;

    setLoading(true);
    try {
      const res = await fetch("/api/kill-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopDomain, action }),
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
        isActive
          ? "bg-red-600 text-white hover:bg-red-700"
          : "bg-green-600 text-white hover:bg-green-700"
      } disabled:opacity-50`}
    >
      {loading ? "Working..." : isActive ? "Disable Widget" : "Enable Widget"}
    </button>
  );
}
