import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <>
      <h1 className="mb-2 text-xl font-semibold text-charcoal">Check your email</h1>
      <p className="text-sm leading-6 text-slate">
        We&apos;ve sent a confirmation link to your email address. Confirm your account, then come back and sign in to
        finish setting up your business.
      </p>
      <Link href="/login" className="mt-6 inline-flex text-sm font-semibold text-signal-orange hover:underline">
        Back to sign in →
      </Link>
    </>
  );
}
