export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-10 py-5">
      <div className="font-sans text-[0.85rem] font-medium tracking-[0.14em] uppercase text-[hsl(var(--ink-bright))]">
        Urban<span className="text-primary">Mind</span>
      </div>
      <div className="font-mono text-[0.6rem] tracking-[0.08em] text-muted-foreground flex items-center gap-2.5">
        <span className="w-[5px] h-[5px] rounded-full bg-primary animate-blink" />
        v0.1 — HackIllinois
      </div>
    </nav>
  );
}
