import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.getClaims();

    return NextResponse.json({
      ok: !error,
      supabaseConfigured: true,
      authCheck: error ? "error" : "ok",
    }, { status: error ? 503 : 200 });
  } catch {
    return NextResponse.json({
      ok: false,
      supabaseConfigured: false,
      authCheck: "not-configured",
    }, { status: 503 });
  }
}
