import "server-only";

export type ProfileCandidate = { slug: string; name: string; description?: string | null };

export type NormalisedSellingProfile = {
  label: string;
  keywords: string[];
  buyerTypes: string[];
  candidateTradeSlug: string | null;
  confidence: number;
  source: "ai" | "fallback";
};

export async function normaliseSellingProfile(input: string, candidates: ProfileCandidate[] = []): Promise<NormalisedSellingProfile> {
  const cleaned = input.trim().replace(/\s+/g, " ").slice(0, 500);
  if (!cleaned) throw new Error("selling_profile_required");

  const aiResult = await tryAiNormalisation(cleaned, candidates);
  if (aiResult) return aiResult;
  return fallbackNormalisation(cleaned, candidates);
}

async function tryAiNormalisation(input: string, candidates: ProfileCandidate[]): Promise<NormalisedSellingProfile | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const candidateText = candidates.slice(0, 120).map((candidate) => `${candidate.slug}: ${candidate.name}${candidate.description ? ` — ${candidate.description}` : ""}`).join("\n");
  const prompt = [
    "You normalize a supplier's free-text description for a B2B opportunity marketplace.",
    "Return concise structured data. Never invent services, customers or categories that are not supported by the input.",
    "Choose candidateTradeSlug only when one candidate is a reasonable match; otherwise return null.",
    `Candidate categories:\n${candidateText || "No candidate categories are available."}`,
    `Supplier description: ${input}`,
  ].join("\n\n");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.PROFILE_NORMALISER_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-5-mini",
        input: prompt,
        text: {
          format: {
            type: "json_schema",
            name: "selling_profile",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                label: { type: "string" },
                keywords: { type: "array", items: { type: "string" } },
                buyerTypes: { type: "array", items: { type: "string" } },
                candidateTradeSlug: { type: ["string", "null"] },
                confidence: { type: "number" },
              },
              required: ["label", "keywords", "buyerTypes", "candidateTradeSlug", "confidence"],
            },
          },
        },
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
    const raw = payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).map((item) => item.text ?? "").join("");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<NormalisedSellingProfile>;
    const candidate = typeof parsed.candidateTradeSlug === "string" && candidates.some((item) => item.slug === parsed.candidateTradeSlug) ? parsed.candidateTradeSlug : null;
    return {
      label: cleanLabel(parsed.label, input),
      keywords: cleanList(parsed.keywords),
      buyerTypes: cleanList(parsed.buyerTypes),
      candidateTradeSlug: candidate,
      confidence: clampConfidence(parsed.confidence),
      source: "ai",
    };
  } catch {
    return null;
  }
}

function fallbackNormalisation(input: string, candidates: ProfileCandidate[]): NormalisedSellingProfile {
  const lower = input.toLowerCase();
  const candidate = candidates.find((item) => {
    const haystack = `${item.slug} ${item.name} ${item.description ?? ""}`.toLowerCase();
    return haystack.split(/[^a-z0-9]+/).some((token) => token.length > 3 && lower.includes(token));
  });
  const keywordMap: Array<[RegExp, string]> = [
    [/epos|payment|card terminal|till|ordering/, "EPOS and payments"],
    [/signage|sign|branding|vehicle graphic/, "Signage and branding"],
    [/broadband|connectivity|telecom|phone|voip|wifi/, "Connectivity and telecoms"],
    [/cctv|security|access control|alarm/, "Security and access"],
    [/fit.?out|refurb|interior|shopfitting/, "Fit-out and interiors"],
    [/solar|battery|heat pump|hvac|energy|ev charging/, "Commercial energy"],
    [/care|clinic|dental|health|medical/, "Care and health services"],
    [/tender|procurement|public contract/, "Public contract delivery"],
  ];
  const keywords = keywordMap.filter(([pattern]) => pattern.test(lower)).map(([, label]) => label);
  return {
    label: input.length > 90 ? `${input.slice(0, 87)}…` : input,
    keywords: keywords.length > 0 ? keywords : ["Supplier services"],
    buyerTypes: inferBuyerTypes(lower),
    candidateTradeSlug: candidate?.slug ?? candidates.find((item) => item.slug === "general-builder")?.slug ?? null,
    confidence: candidate ? 0.72 : 0.45,
    source: "fallback",
  };
}

function inferBuyerTypes(value: string): string[] {
  const types: string[] = [];
  if (/restaurant|cafe|pub|hotel|hospitality|takeaway/.test(value)) types.push("Hospitality operators");
  if (/office|retail|warehouse|industrial|commercial|business/.test(value)) types.push("Growing businesses");
  if (/care|clinic|dental|health|medical/.test(value)) types.push("Care and health providers");
  return types.length > 0 ? types : ["Businesses entering a buying window"];
}

function cleanList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))].slice(0, 8);
}

function cleanLabel(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 120) : fallback;
}

function clampConfidence(value: unknown): number {
  const number = typeof value === "number" && Number.isFinite(value) ? value : 0.5;
  return Math.min(1, Math.max(0, number));
}
