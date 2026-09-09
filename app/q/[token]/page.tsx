import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/logo";
import { QuoteLinkResponse } from "@/components/quote-link-response";
import { getPublicQuoteLinkContext } from "@/lib/outreach/quote-link-context";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Project quote request | MyTradeBox",
  robots: { index: false, follow: false, nocache: true },
};

export default async function QuoteLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const context = await getPublicQuoteLinkContext(token);
  if (!context) notFound();

  const { company, project, link } = context;
  const professional = link.audienceType === "professional" || link.audienceType === "business";

  return (
    <main className="min-h-screen bg-soft-surface text-charcoal">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex items-center justify-between gap-4">
          <Logo />
          <span className="rounded-full border border-light-grey bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate">Secure project response</span>
        </div>

        <section className="mt-8 overflow-hidden rounded-[2rem] border border-light-grey bg-white shadow-[0_20px_60px_rgba(31,41,55,0.08)] sm:mt-12">
          <div className="bg-charcoal px-6 py-8 text-white sm:px-9 sm:py-10">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-signal-orange">{professional ? "Project introduction" : "Local project quote"}</p>
            <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
              {professional ? `Discuss this project with ${company.tradingName}` : `Interested in a quote from ${company.tradingName}?`}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
              {professional
                ? `${company.tradingName} provides ${project.tradeName.toLowerCase()} services and has been introduced in relation to ${project.projectType ? `a ${project.projectType.toLowerCase()} project` : "a relevant local project"}.`
                : `${company.tradingName} provides ${project.tradeName.toLowerCase()} services in your area. You can call them directly or request a quote below.`}
            </p>
          </div>

          <div className="px-5 py-6 sm:px-9 sm:py-8">
            <QuoteLinkResponse
              token={token}
              tradingName={company.tradingName}
              phone={company.phone}
              audienceType={link.audienceType}
              projectType={project.projectType}
            />
          </div>
        </section>

        <div className="mt-auto pt-8 text-center text-xs leading-5 text-slate">
          <p>Powered by MyTradeBox. This page does not display the project address, planning reference or applicant details.</p>
          <p className="mt-1"><Link href="/privacy" className="font-medium text-charcoal hover:text-signal-orange">Privacy information</Link></p>
        </div>
      </div>
    </main>
  );
}
