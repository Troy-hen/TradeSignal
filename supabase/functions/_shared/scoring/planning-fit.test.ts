import { assertEquals } from "jsr:@std/assert@1";
import { deterministicPlanningFitScore } from "./planning-fit.ts";

Deno.test("uses strong source evidence instead of an AI numeric score", () => {
  assertEquals(deterministicPlanningFitScore(
    { application_type: "Full", proposal_description: "Office fit-out and workplace refurbishment" },
    { slug: "fit-out-interiors", name: "Fit-out and interiors", ai_detection_hints: { strongKeywords: ["office fit-out"] } },
  ), 95);
});

Deno.test("keeps a structured inferred category at a transparent baseline", () => {
  assertEquals(deterministicPlanningFitScore(
    { application_type: "Full", proposal_description: "Change of use for a new business premises" },
    { slug: "managed-it-services", name: "Managed IT services", ai_detection_hints: { keywords: ["managed IT"] } },
  ), 58);
});
