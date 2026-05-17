export default function Header() {
  return (
    <header className="relative overflow-hidden border-b border-white/5">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary-900/30 to-transparent pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-primary-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 py-8 text-center">
        {/* Logo */}
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-600/30">
              <span className="text-lg">✦</span>
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-accent animate-pulse" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            Lead Finder <span className="text-gradient">AI</span>
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-3 tracking-tight">
          Find anyone.{" "}
          <span className="text-gradient">Analyze everything.</span>{" "}
          Export instantly.
        </h1>
        <p className="text-white/50 text-lg max-w-2xl mx-auto">
          Universal AI-powered lead generation — buyers, influencers, distributors,
          partners, investors, and beyond.
        </p>

        {/* Stats pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          {[
            { icon: "🎯", label: "6 lead types" },
            { icon: "🤖", label: "Apify + GPT-4o" },
            { icon: "📊", label: "10-point scoring" },
            { icon: "📥", label: "Excel export" },
          ].map((s) => (
            <span
              key={s.label}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-white/60"
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
