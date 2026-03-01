"use client"

import { useEffect, useRef, useState } from "react"


class Node {
  x: number; y: number
  vx: number; vy: number
  size: number; opacity: number

  constructor(w: number, h: number) {
    this.x = Math.random() * w
    this.y = Math.random() * h
    this.vx = (Math.random() - 0.5) * 1.4
    this.vy = (Math.random() - 0.5) * 1.4
    this.size = Math.random() < 0.1 ? 2.5 : Math.random() < 0.3 ? 1.4 : 0.8
    this.opacity = 0.45 + Math.random() * 0.55
  }

  update(w: number, h: number) {
    this.x += this.vx; this.y += this.vy
    this.vx += (Math.random() - 0.5) * 0.14
    this.vy += (Math.random() - 0.5) * 0.14
    this.vx *= 0.97; this.vy *= 0.97
    if (this.x < 0 || this.x > w) this.vx *= -1
    if (this.y < 0 || this.y > h) this.vy *= -1
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(210,140,70,${this.opacity})`
    ctx.fill()
    if (this.size > 1.6) {
      ctx.beginPath()
      ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(192,120,64,${this.opacity * 0.08})`
      ctx.fill()
    }
  }
}

export default function LoadingScreen({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pct, setPct] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    const MAX_DIST = 130
    const nodes = Array.from({ length: 120 }, () => new Node(canvas.width, canvas.height))
    let animId: number

    const frame = () => {
      animId = requestAnimationFrame(frame)
      const W = canvas.width
      const H = canvas.height
      
      ctx.clearRect(0, 0, W, H)

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < MAX_DIST) {
            const op = (1 - dist / MAX_DIST) * 0.35
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = `rgba(160,100,48,${op})`
            ctx.lineWidth = 0.6
            ctx.stroke()
          }
        }
      }

      nodes.forEach(n => { 
        n.update(W, H); 
        n.draw(ctx) 
      })
    }
    frame()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener("resize", resize)
    }
  }, [])

  // progress bar logic
  useEffect(() => {
    let current = 0
    const interval = setInterval(() => {
      current = Math.min(current + (0.8 + Math.random() * 2.2), 99)
      setPct(Math.floor(current))
      if (current >= 99) {
        clearInterval(interval)
        setDone(true)
        setPct(100)
      }
    }, 280)

    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden
      transition-opacity duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]
      ${active ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      style={{ background: "#120e08" }}
    >
      {/* ... (Keep your JSX exactly as it was) ... */}
      <div className="fixed inset-0 z-[3] pointer-events-none" style={{
        opacity: 0.03,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
      }} />
      <div className="fixed inset-0 z-[2] pointer-events-none" style={{
        background: "radial-gradient(ellipse at center, transparent 40%, rgba(10,8,4,0.6) 100%)"
      }} />
      <div className="fixed top-0 left-0 right-0 z-40" style={{ height: "1px", background: "#1e1810" }}>
        <div
          className="h-full transition-all duration-400 ease-out"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #5a3818, #c07840)"
          }}
        />
      </div>
      <canvas ref={canvasRef} className="fixed inset-0 z-[1]" />
      <nav className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-10 py-5">
        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "0.85rem", fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "#f2e8d8" }}>
          Urban<span style={{ color: "#c07840" }}>Mind</span>
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.6rem", letterSpacing: "0.08em", color: "#42382a", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{
            width: 5, height: 5, borderRadius: "50%", background: "#c07840",
            display: "inline-block",
            animation: "blink 1s step-end infinite"
          }} />
          Simulating
        </div>
      </nav>
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-30 pointer-events-none" style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "0.58rem",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "#3a3020"
      }}>
        {done ? "Complete" : pct > 0 ? `${pct}%` : ""}
      </div>
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}