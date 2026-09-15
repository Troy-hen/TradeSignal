import { NextResponse } from "next/server";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { getVendorCapabilities } from "@/lib/vendors/readiness";

export async function GET() {
  await requireCurrentCompany();
  return NextResponse.json(getVendorCapabilities(), {
    headers: { "Cache-Control": "private, max-age=30" },
  });
}
