import "server-only";

export type OpportunityContactType =
  | "residential_homeowner"
  | "residential_with_agent"
  | "commercial_company"
  | "developer"
  | "public_sector"
  | "unknown";

export type ContactStrategy = {
  type: OpportunityContactType;
  label: string;
  primaryChannel: "postal" | "planning_professional" | "business_contact" | "manual_review";
  secondaryChannel: "doorstep" | "planning_professional" | "business_contact" | "postal" | null;
  headline: string;
  explanation: string;
  useApplicantNameForPostal: false;
  allowConsumerEnrichment: false;
  allowBusinessEnrichment: boolean;
  preferPlanningContactData: boolean;
  suggestedRecipient: string;
};

type Input = {
  applicantName: string | null;
  agentCompany: string | null;
  isCommercial: boolean | null;
  applicationType: string | null;
  proposalDescription: string | null;
  projectType?: string | null;
};

const COMPANY_WORDS = /\b(ltd|limited|plc|llp|holdings?|properties|property|developments?|construction|group|homes|housing|estates?|investments?|services)\b/i;
const DEVELOPER_WORDS = /\b(developer|development|developments|new homes?|housing scheme|residential scheme|estate|apartments?|flats?|dwellings?)\b/i;
const PUBLIC_SECTOR_WORDS = /\b(council|borough|district council|county council|nhs|academy|school|college|university|government|ministry|police|fire service|housing association|public sector)\b/i;

export function deriveContactStrategy(input: Input): ContactStrategy {
  const applicant = input.applicantName?.trim() ?? "";
  const agent = input.agentCompany?.trim() ?? "";
  const context = [applicant, agent, input.applicationType, input.proposalDescription, input.projectType]
    .filter(Boolean)
    .join(" ");

  if (PUBLIC_SECTOR_WORDS.test(context)) return publicSector();
  if (DEVELOPER_WORDS.test(context) && (COMPANY_WORDS.test(applicant) || input.isCommercial === true)) return developer();
  if (input.isCommercial === true || COMPANY_WORDS.test(applicant)) return commercial();
  if (agent) return residentialWithAgent();
  if (input.isCommercial === false || looksResidential(context)) return residentialHomeowner();
  return unknown(agent.length > 0);
}

function looksResidential(value: string) {
  return /\b(extension|loft|roof|garage|porch|conservatory|dwelling|householder|domestic|alteration|single storey|two storey)\b/i.test(value);
}

function residentialHomeowner(): ContactStrategy {
  return {
    type: "residential_homeowner",
    label: "Homeowner-led residential",
    primaryChannel: "postal",
    secondaryChannel: "doorstep",
    headline: "Lead with a personalised letter to the project address.",
    explanation: "No planning professional is visible on the record. MyTradeBox should use the project address for postal outreach and avoid attempting to discover a homeowner's private email or mobile number.",
    useApplicantNameForPostal: false,
    allowConsumerEnrichment: false,
    allowBusinessEnrichment: false,
    preferPlanningContactData: false,
    suggestedRecipient: "Property Owner / Occupier",
  };
}

function residentialWithAgent(): ContactStrategy {
  return {
    type: "residential_with_agent",
    label: "Residential with planning professional",
    primaryChannel: "postal",
    secondaryChannel: "planning_professional",
    headline: "Approach the property and the planning professional as two separate routes.",
    explanation: "Use a letter to the project address for the homeowner route, then use published business contact details for the architect or planning agent where available. Repeated agent activity can be more valuable than the individual project.",
    useApplicantNameForPostal: false,
    allowConsumerEnrichment: false,
    allowBusinessEnrichment: true,
    preferPlanningContactData: true,
    suggestedRecipient: "Property Owner / Occupier",
  };
}

function commercial(): ContactStrategy {
  return {
    type: "commercial_company",
    label: "Commercial / company-led",
    primaryChannel: "planning_professional",
    secondaryChannel: "business_contact",
    headline: "Start with the published project contact, then enrich the organisation if needed.",
    explanation: "Planning-agent contact data is the cheapest and most directly relevant source. Company intelligence should only be used when the planning record does not provide a useful business contact.",
    useApplicantNameForPostal: false,
    allowConsumerEnrichment: false,
    allowBusinessEnrichment: true,
    preferPlanningContactData: true,
    suggestedRecipient: "Project Team",
  };
}

function developer(): ContactStrategy {
  return {
    type: "developer",
    label: "Developer-led",
    primaryChannel: "planning_professional",
    secondaryChannel: "business_contact",
    headline: "Treat this as an account opportunity, not a one-off homeowner lead.",
    explanation: "Prioritise the planning agent/developer relationship, related projects and business contact intelligence. Postal outreach to the project address is secondary unless the source record indicates a useful site office or correspondence address.",
    useApplicantNameForPostal: false,
    allowConsumerEnrichment: false,
    allowBusinessEnrichment: true,
    preferPlanningContactData: true,
    suggestedRecipient: "Development / Procurement Team",
  };
}

function publicSector(): ContactStrategy {
  return {
    type: "public_sector",
    label: "Public-sector / institutional",
    primaryChannel: "business_contact",
    secondaryChannel: "planning_professional",
    headline: "Use official organisation and procurement routes.",
    explanation: "Avoid consumer-style outreach. Surface the public organisation, published project contacts and procurement context, then use business/public-sector contact channels only.",
    useApplicantNameForPostal: false,
    allowConsumerEnrichment: false,
    allowBusinessEnrichment: true,
    preferPlanningContactData: true,
    suggestedRecipient: "Estates / Procurement Team",
  };
}

function unknown(hasAgent: boolean): ContactStrategy {
  return {
    type: "unknown",
    label: "Contact route needs review",
    primaryChannel: hasAgent ? "planning_professional" : "manual_review",
    secondaryChannel: hasAgent ? "postal" : null,
    headline: hasAgent ? "Start with the planning professional while the applicant type is unclear." : "Review the source record before selecting an outreach channel.",
    explanation: "MyTradeBox has not seen enough reliable evidence to classify this as homeowner, company, developer or public-sector work. It should not infer personal contact details from uncertainty.",
    useApplicantNameForPostal: false,
    allowConsumerEnrichment: false,
    allowBusinessEnrichment: hasAgent,
    preferPlanningContactData: hasAgent,
    suggestedRecipient: "Property Owner / Occupier",
  };
}
