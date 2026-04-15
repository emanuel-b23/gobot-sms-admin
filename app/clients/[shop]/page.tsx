import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { KillSwitchButton } from "@/components/kill-switch-button";

export default async function ClientDetail({
  params,
}: {
  params: Promise<{ shop: string }>;
}) {
  const { shop: shopParam } = await params;
  const shopDomain = decodeURIComponent(shopParam);
  const supabase = createServiceRoleClient();

  // Fetch shop config
  const { data: shop } = await supabase
    .from("merchant_settings")
    .select("*")
    .eq("shop_domain", shopDomain)
    .single();

  if (!shop) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <p className="text-red-600">Merchant not found: {shopDomain}</p>
        <Link href="/" className="text-blue-600 text-sm mt-4 inline-block">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  // Fetch recent compliance records
  const { data: records } = await supabase
    .from("compliance_ledger")
    .select("id, phone_e164, email, consent_status, ab_group, legal_basis, timestamp_utc, klaviyo_synced, shopify_synced")
    .eq("shop_domain", shopDomain)
    .order("timestamp_utc", { ascending: false })
    .limit(20);

  // Trial metrics
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const since = shop.trial_started_at || thirtyDaysAgo;

  const { count: treatmentCount } = await supabase
    .from("compliance_ledger")
    .select("id", { count: "exact", head: true })
    .eq("shop_domain", shopDomain)
    .eq("consent_status", "OPTED_IN")
    .eq("ab_group", "treatment")
    .gte("timestamp_utc", since);

  const { count: controlCount } = await supabase
    .from("compliance_ledger")
    .select("id", { count: "exact", head: true })
    .eq("shop_domain", shopDomain)
    .eq("consent_status", "OPTED_IN")
    .eq("ab_group", "control")
    .gte("timestamp_utc", since);

  const { data: impressions } = await supabase
    .from("ab_impressions")
    .select("ab_group")
    .eq("shop_domain", shopDomain)
    .gte("created_at", since);

  const treatmentImpressions = impressions?.filter((i) => i.ab_group === "treatment").length || 0;
  const controlImpressions = impressions?.filter((i) => i.ab_group === "control").length || 0;

  const treatmentMCR = treatmentImpressions > 0 ? ((treatmentCount || 0) / treatmentImpressions) * 100 : 0;
  const controlMCR = controlImpressions > 0 ? ((controlCount || 0) / controlImpressions) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
              ← Back to dashboard
            </Link>
            <h1 className="text-xl font-semibold text-gray-900 mt-1">{shop.shop_domain}</h1>
          </div>
          <KillSwitchButton shopDomain={shop.shop_domain} isActive={shop.is_active} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Status overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoCard label="Widget" value={shop.is_active ? "ON" : "OFF"} valueClass={shop.is_active ? "text-green-700" : "text-gray-500"} />
          <InfoCard label="Installed" value={shop.created_at ? new Date(shop.created_at).toLocaleDateString() : "—"} />
          <InfoCard label="Trial Status" value={shop.trial_archived ? "Archived" : shop.trial_ended_at ? "Complete" : shop.trial_started_at ? "Active" : "Not started"} />
          <InfoCard label="Billing Tier" value={shop.billing_tier || "—"} />
        </div>

        {/* Trial A/B results */}
        {shop.trial_started_at && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">A/B Trial Results</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-gray-500 mb-1">Gobot OTP (Treatment)</div>
                <div className="text-3xl font-semibold">{treatmentMCR.toFixed(1)}% MCR</div>
                <div className="text-sm text-gray-500 mt-1">
                  {treatmentCount} opt-ins from {treatmentImpressions} sessions
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Simple Consent (Control)</div>
                <div className="text-3xl font-semibold">{controlMCR.toFixed(1)}% MCR</div>
                <div className="text-sm text-gray-500 mt-1">
                  {controlCount} opt-ins from {controlImpressions} sessions
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ESP configuration */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">ESP Configuration</h2>
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <div className="font-medium text-gray-700 mb-2">Klaviyo</div>
              <div className="space-y-1 text-gray-600">
                <div>Enabled: <span className={shop.klaviyo_enabled ? "text-green-700" : "text-gray-500"}>{shop.klaviyo_enabled ? "Yes" : "No"}</span></div>
                <div>Key set: {shop.klaviyo_key_encrypted ? "Yes" : "No"}</div>
                <div>OTP List ID: {shop.klaviyo_list_id || "—"}</div>
                <div>Control List ID: {shop.klaviyo_control_list_id || "—"}</div>
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-700 mb-2">Attentive</div>
              <div className="space-y-1 text-gray-600">
                <div>Enabled: <span className={shop.attentive_enabled ? "text-green-700" : "text-gray-500"}>{shop.attentive_enabled ? "Yes" : "No"}</span></div>
                <div>Key set: {shop.attentive_key_encrypted ? "Yes" : "No"}</div>
                <div>OTP Source ID: {shop.attentive_source_id || "—"}</div>
                <div>Control Source ID: {shop.attentive_control_source_id || "—"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent consent records */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">Recent Consent Records</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left font-medium text-gray-700 px-4 py-2">Phone</th>
                <th className="text-left font-medium text-gray-700 px-4 py-2">Email</th>
                <th className="text-left font-medium text-gray-700 px-4 py-2">Group</th>
                <th className="text-left font-medium text-gray-700 px-4 py-2">Status</th>
                <th className="text-left font-medium text-gray-700 px-4 py-2">Syncs</th>
                <th className="text-left font-medium text-gray-700 px-4 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {(records || []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">No records yet.</td>
                </tr>
              )}
              {(records || []).map((r) => (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-mono text-xs">{r.phone_e164}</td>
                  <td className="px-4 py-2 text-gray-600">{r.email || "—"}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${r.ab_group === "treatment" ? "bg-green-50 text-green-700" : r.ab_group === "control" ? "bg-blue-50 text-blue-700" : "bg-gray-50 text-gray-600"}`}>
                      {r.ab_group || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs">{r.consent_status}</td>
                  <td className="px-4 py-2 text-xs text-gray-600">
                    {r.shopify_synced && <span className="mr-1">S</span>}
                    {r.klaviyo_synced && <span className="mr-1">K</span>}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {r.timestamp_utc ? new Date(r.timestamp_utc).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function InfoCard({
  label,
  value,
  valueClass = "text-gray-900",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className={`text-lg font-semibold mt-1 ${valueClass}`}>{value}</div>
    </div>
  );
}
