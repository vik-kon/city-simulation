"use client"

import { useState } from "react";
import LoadingScreen from "./components/LoadingScreen";
import Globe from "./components/Globe";
import Navbar from "./components/Navbar";
import PromptBox from "./components/PromptBox";

export default function Index() {
  const [loading, setLoading] = useState(false);

  return (
    <>
      {/* Always mounted */}
      <LoadingScreen active={loading} />

      <div
        className={`w-full h-screen overflow-hidden bg-background
        transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]
        ${loading ? "opacity-0 scale-[1.01]" : "opacity-100 scale-100"}`}
      >
        <Globe />
        <Navbar />

        <div className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div className="w-[min(680px,88vw)] text-center pointer-events-auto">
            <div className="font-mono text-[0.58rem] tracking-[0.16em] uppercase text-[hsl(var(--copper-dim))] mb-5">
              Urban policy simulation
            </div>

            <h1 className="font-serif text-[clamp(2rem,3.5vw,3.2rem)] font-normal italic leading-[1.1] text-[hsl(var(--ink-bright))] mb-8 tracking-[-0.01em]">
              What should your<br />city try next?
            </h1>

            <PromptBox onSimulate={() => setLoading(true)} />
          </div>
        </div>
      </div>
    </>
  );
}