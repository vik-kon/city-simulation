"use client"

import { useState } from "react";
import { Play } from "lucide-react";

export default function PromptBox() {
  const [value, setValue] = useState("");

  return (
    <div className="flex items-stretch border border-border rounded-[3px] overflow-hidden bg-card/80 backdrop-blur-[30px] transition-colors focus-within:border-primary/30 text-left">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Describe any urban policy for any city — e.g. 'Ban single-use plastics in Chicago by 2026 and fund enforcement through a retail levy.'"
        className="flex-1 bg-transparent border-none outline-none px-[1.15rem] py-4 font-sans text-[0.88rem] font-light text-foreground leading-relaxed resize-none h-20 overflow-hidden placeholder:text-muted-foreground/40"
      />
      <div className="w-px bg-border flex-shrink-0" />
      <button className="flex-shrink-0 bg-transparent border-none px-5 cursor-pointer font-mono text-[0.65rem] tracking-[0.14em] uppercase text-primary flex items-center gap-[0.45rem] transition-colors hover:text-[hsl(var(--ink-bright))] whitespace-nowrap">
        <Play className="w-3 h-3" strokeWidth={1.5} />
        Simulate
      </button>
    </div>
  );
}
