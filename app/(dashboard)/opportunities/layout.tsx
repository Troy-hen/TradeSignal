export default function OpportunitiesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-w-0 w-full [&_.max-w-5xl]:max-w-none">
      {children}
    </div>
  );
}
