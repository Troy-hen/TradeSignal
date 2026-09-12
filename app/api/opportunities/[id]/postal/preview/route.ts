import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentCompany } from "@/lib/auth/get-current-company";
import { getPostalOpportunityContext } from "@/lib/outreach/postal-context";
import { getPostalOutreachProvider } from "@/lib/outreach/postal-provider";

const bodySchema = z.object({ content: z.string().trim().min(20).max(12000) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireCurrentCompany();
  const { id } = await params;
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const provider = getPostalOutreachProvider();
  if (!provider) return NextResponse.json({ error: "postal_provider_not_configured" }, { status: 503 });

  const context = await getPostalOpportunityContext(id);
  if (!context) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!context.recipient) return NextResponse.json({ error: "postal_address_unavailable" }, { status: 422 });

  try {
    const validation = await provider.validateAddress(context.recipient);
    if (!validation.valid) {
      return NextResponse.json({ error: "postal_address_not_validated", recipient: validation.normalized ?? context.recipient }, { status: 422 });
    }
    const recipient = validation.normalized ?? context.recipient;
    const deliveryId = crypto.randomUUID();
    const preview = await provider.previewLetter({
      deliveryId,
      recipient,
      content: body.data.content,
      reference: `opportunity-${id}`,
    });
    return NextResponse.json({
      deliveryId,
      provider: provider.name,
      preview,
      recipient,
      contactType: context.strategy.type,
      recipientLabel: context.strategy.suggestedRecipient,
    });
  } catch (error) {
    console.error("Postal preview failed", error);
    return NextResponse.json({ error: "postal_preview_failed" }, { status: 502 });
  }
}
