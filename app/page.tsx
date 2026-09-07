import { Logo } from "@/components/logo";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <Logo className="scale-125" />
      <p className="max-w-md text-slate">
        Your next £20k job may already be in planning. The full landing page
        is under construction.
      </p>
    </main>
  );
}
