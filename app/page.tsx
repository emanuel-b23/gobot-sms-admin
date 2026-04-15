import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";

type Shop = {
  shop_domain: string;
  is_active: boolean;
  trial_started_at: string | null;
  trial_ended_at: string | null;
  trial_archived: boolean | null;
  billing_tier: string | null;
  klaviyo_enabled: boolean;
  klaviyo_key_encrypted: string | null;
  attentive_enabled: boolean;
  attentive_key_encrypted: string | null;
  uninstalled_at: string | null;
  created_at: string;
};

function getStatus(shop: Shop) {
  if (shop.uninstalled_at) return { label: "Inactive", color: "bg-gray-100 text-gray-700" };
  if (shop.trial_started_at && !shop.trial_ended_at) return { label: "Trial Active", color: "bg-yellow-100 text-yellow-800" };
  if (shop.trial_ended_at && !shop.trial_archived) return { label: "Trial Complete", color: "bg-blue-100 text-blue-800" };
  if (shop.trial_archived) return { label: "Post-Trial", color: "bg-green-100 text-green-800" };
  return { label: "Setup", color: "bg-gray-100 text-gray-700" };
}

export default async function Dashboard() {
  const supabase = createServiceRoleClient();
  const { data: shops, error } = await supabase
    .from("merchant_settings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-600">Error loading merchants: {error.message}</p>
      </div>
    );
  }

  const shopList = (shops || []) as Shop[];

  // Top-level metrics
  const totalShops = shopList.length;
  const activeShops = shopList.filter((s) => !s.uninstalled_at).length;
  const activeTrials = shopList.filter(
    (s) => s.trial_started_at && !s.trial_ended_at && !s.uninstalled_at,
  ).length;
  const completedTrials = shopList.filter((s) => s.trial_ended_at).length;
  const inactiveShops = shopList.filter((s) => s.uninstalled_at).length;

  // Total verified subscribers (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count: totalSubs } = await supabase
    .from("compliance_ledger")
    .select("id", { count: "exact", head: true })
    .eq("consent_status", "OPTED_IN")
    .gte("timestamp_utc", thirtyDaysAgo);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Gobot Admin</h1>
          <SignOutButton />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <MetricCard label="Total Merchants" value={totalShops} />
          <MetricCard label="Active" value={activeShops} color="text-green-700" />
          <MetricCard label="Trial Active" value={activeTrials} color="text-yellow-700" />
          <MetricCard label="Trial Complete" value={completedTrials} color="text-blue-700" />
          <MetricCard label="Inactive" value={inactiveShops} color="text-gray-500" />
        </div>

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Merchants</h2>
          <div className="text-sm text-gray-500">
            Total verified subscribers (last 30d):{" "}
            <span className="font-medium text-gray-900">{totalSubs || 0}</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left font-medium text-gray-700 px-4 py-3">Shop</th>
                <th className="text-left font-medium text-gray-700 px-4 py-3">Status</th>
                <th className="text-left font-medium text-gray-700 px-4 py-3">Widget</th>
                <th className="text-left font-medium text-gray-700 px-4 py-3">ESPs</th>
                <th className="text-left font-medium text-gray-700 px-4 py-3">Billing Tier</th>
                <th className="text-left font-medium text-gray-700 px-4 py-3">Installed</th>
                <th className="text-right font-medium text-gray-700 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {shopList.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No merchants yet.
                  </td>
                </tr>
              )}
              {shopList.map((shop) => {
                const status = getStatus(shop);
                return (
                  <tr key={shop.shop_domain} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/clients/${encodeURIComponent(shop.shop_domain)}`}
                        className="text-gray-900 font-medium hover:text-blue-600"
                      >
                        {shop.shop_domain}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${shop.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                        {shop.is_active ? "ON" : "OFF"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {shop.klaviyo_enabled && shop.klaviyo_key_encrypted && <span className="inline-block mr-2 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">Klaviyo</span>}
                      {shop.attentive_enabled && shop.attentive_key_encrypted && <span className="inline-block px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">Attentive</span>}
                      {!shop.klaviyo_enabled && !shop.attentive_enabled && <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{shop.billing_tier || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {shop.created_at ? new Date(shop.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/clients/${encodeURIComponent(shop.shop_domain)}`}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function MetricCard({
  label,
  value,
  color = "text-gray-900",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${color}`}>{value}</div>
    </div>
  );
}
