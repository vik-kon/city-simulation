'use client';

import { useCallback, useState, useEffect } from 'react';
import { OverviewSection } from '@/app/components/OverviewSection';
import { DetailedSection } from '@/app/components/DetailedSection';
import { ResilienceSection } from '@/app/components/ResilienceSection';
import Link from 'next/link';

const TOTAL_SECTIONS = 3;

export default function ResultsPage() {
  const [current, setCurrent] = useState(0);

  const goTo = useCallback((index: number) => {
    if (index < 0 || index >= TOTAL_SECTIONS) return;
    setCurrent(index);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goTo(current + 1);
      if (e.key === 'ArrowLeft') goTo(current - 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [current, goTo]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      {/* Nav Dots */}
      <div className="fixed right-8 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">
        {Array.from({ length: TOTAL_SECTIONS }).map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              i === current ? 'bg-primary scale-150' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Arrow Nav */}
      {current > 0 && (
        <button
          onClick={() => goTo(current - 1)}
          className="fixed left-5 top-1/2 -translate-y-1/2 z-50 text-5xl text-primary font-mono opacity-60 hover:opacity-100 hover:scale-110 transition-all"
        >
          ◂
        </button>
      )}
      {current < TOTAL_SECTIONS - 1 && (
        <button
          onClick={() => goTo(current + 1)}
          className="fixed right-14 top-1/2 -translate-y-1/2 z-50 text-5xl text-primary font-mono opacity-60 hover:opacity-100 hover:scale-110 transition-all"
        >
          ▸
        </button>
      )}

      {/* Back to Home Button */}
      <Link
        href="/"
        className="fixed top-5 left-5 z-50 text-sm text-primary hover:text-primary/80 transition-colors"
      >
        ← Back Home
      </Link>

      {/* Sections */}
      <div
        className="fixed inset-0 flex transition-transform duration-[900ms] ease-[cubic-bezier(0.77,0,0.175,1)]"
        style={{ transform: `translateX(-${current * 100}vw)` }}
      >
        <OverviewSection key={current === 0 ? 'ov-active' : 'ov-idle'} />
        <DetailedSection key={current === 1 ? 'dt-active' : 'dt-idle'} />
        <ResilienceSection key={current === 2 ? 'rs-active' : 'rs-idle'} />
      </div>
    </div>
  );
}
