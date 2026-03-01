"use client"

import { useState } from "react";
import { useSimulation } from "@/app/context/SimulationContext";
import { useRouter } from "next/navigation";
import { runSimulation } from "@/app/lib/api";

export default function PromptBox({
  onSimulateAction,
  onErrorAction,
}: {
  onSimulateAction: () => void;
  onErrorAction: () => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { setSimulationData } = useSimulation();
  const router = useRouter();

  const handleSimulate = async () => {
    if (!value.trim()) return;

    setError(null);
    onSimulateAction();

    try {
      const data = await runSimulation(value.trim());
      setSimulationData(data);
      router.push("/results");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      onErrorAction();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-stretch border border-border rounded-[3px] overflow-hidden bg-card/80 backdrop-blur-[30px] transition-colors focus-within:border-primary/30 text-left">
        <textarea
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSimulate(); } }}
          placeholder="Describe any urban policy for any city ex) 'Ban single-use plastics in Chicago by 2026 and fund enforcement through a retail levy.'"
          className="flex-1 bg-transparent border-none outline-none px-[1.15rem] py-4 font-sans text-[0.88rem] font-light text-foreground leading-relaxed resize-none h-20 overflow-hidden placeholder:text-muted-foreground/40"
        />
        <div className="w-px bg-border flex-shrink-0" />
        <button
          onClick={handleSimulate}
          disabled={!value.trim()}
          className="flex-shrink-0 bg-transparent border-none px-5 cursor-pointer font-mono text-[0.65rem] tracking-[0.14em] uppercase text-primary flex items-center gap-[0.45rem] transition-colors hover:text-primary/70 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Simulate
        </button>
      </div>
      {error && (
        <p className="text-[11px] font-mono text-negative/80 px-1">{error}</p>
      )}
    </div>
  );
}
