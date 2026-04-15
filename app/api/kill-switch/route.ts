import { NextResponse } from "next/server";
import { createSupabaseServerClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  // Verify admin auth
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { shopDomain, action, reason } = body as {
    shopDomain?: string;
    action?: "enable" | "disable";
    reason?: string;
  };

  if (!shopDomain || !action) {
    return NextResponse.json(
      { error: "shopDomain and action required" },
      { status: 400 },
    );
  }

  if (action !== "enable" && action !== "disable") {
    return NextResponse.json(
      { error: "action must be 'enable' or 'disable'" },
      { status: 400 },
    );
  }

  const serviceClient = createServiceRoleClient();
  const updates: Record<string, unknown> =
    action === "disable"
      ? {
          admin_disabled: true,
          admin_disabled_reason: reason || "Your Gobot SMS app has been disabled by support. Please contact us to restore service.",
          admin_disabled_at: new Date().toISOString(),
        }
      : {
          admin_disabled: false,
          admin_disabled_reason: null,
          admin_disabled_at: null,
        };

  const { error } = await serviceClient
    .from("merchant_settings")
    .update(updates)
    .eq("shop_domain", shopDomain);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[admin] ${user.email} ${action}d widget for ${shopDomain}`);

  return NextResponse.json({ success: true });
}
