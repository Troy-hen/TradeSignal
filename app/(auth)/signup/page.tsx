"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp } from "@/lib/actions/auth";
import { SubmitButton } from "@/components/submit-button";

export default function SignupPage() {
  const [state, formAction] = useActionState(signUp, undefined);

  return (
    <>
      <h1 className="mb-1 text-xl font-semibold text-charcoal">Create your account</h1>
      <p className="mb-6 text-sm text-slate">Free to join. Tell us what you sell, who you sell to and where you operate before choosing coverage.</p>
      <form action={formAction} className="space-y-4">
        <div><label htmlFor="fullName" className="mb-1 block text-sm font-medium text-charcoal">Full name</label><input id="fullName" name="fullName" type="text" required autoComplete="name" className="w-full rounded-md border border-light-grey px-3 py-2 text-sm focus:border-signal-orange focus:outline-none" /></div>
        <div><label htmlFor="email" className="mb-1 block text-sm font-medium text-charcoal">Email</label><input id="email" name="email" type="email" required autoComplete="email" className="w-full rounded-md border border-light-grey px-3 py-2 text-sm focus:border-signal-orange focus:outline-none" /></div>
        <div><label htmlFor="password" className="mb-1 block text-sm font-medium text-charcoal">Password</label><input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="w-full rounded-md border border-light-grey px-3 py-2 text-sm focus:border-signal-orange focus:outline-none" /></div>
        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        <SubmitButton pendingText="Creating account…">Create account</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-slate">Already have an account? <Link href="/login" className="font-medium text-signal-orange hover:underline">Sign in</Link></p>
    </>
  );
}
