"""
City-Sim — Modal simulation backend
Uses Qwen 3 (or any model available on Modal) to run the agent simulation.

Deploy:
    modal deploy modal_simulate.py

Then copy the printed endpoint URL into .env.local:
    MODAL_SIMULATE_URL=https://<your-workspace>--city-sim-simulate.modal.run
    MODAL_TOKEN=<optional — only needed if your endpoint has auth enabled>

The /api/simulate Next.js route calls this endpoint as:
    POST { "prompt": "..." }
and expects back the ModalResponse shape defined below.
"""

import modal

app = modal.App("city-sim")

# ── Image ─────────────────────────────────────────────────────────────────────
# Add whatever Python packages your simulation needs
image = (
    modal.Image.debian_slim()
    .pip_install(
        "openai",        # if you call Qwen via an OpenAI-compatible API
        "anthropic",     # optional: orchestration layer
        "pydantic",
    )
)

# ── Response schema ───────────────────────────────────────────────────────────
# Must match the ModalResponse interface in app/api/simulate/route.ts

from pydantic import BaseModel
from typing import Any

class AggregateMetrics(BaseModel):
    consumer_price_index: float    # % change, e.g. 3.2
    household_real_income: float   # $ delta per household, e.g. -840
    employment_impact: float       # % change, e.g. -1.4
    municipal_revenue: float       # $M, e.g. 290.0

class SectorItem(BaseModel):
    name: str
    impact: float

class TimeSeriesPoint(BaseModel):
    month: str
    value: float
    baseline: float

class SimulationResult(BaseModel):
    aggregate_metrics: AggregateMetrics
    population_impact: dict[str, list[float]]   # { "Low Income": [-8.2, ...], ... }
    sectoral_data: list[SectorItem]
    agent_time_series: list[TimeSeriesPoint]    # 12 monthly data points
    winners: list[str]                          # 2-4 items
    losers: list[str]                           # 2-4 items

# ── Endpoint ──────────────────────────────────────────────────────────────────

@app.function(image=image)
@modal.web_endpoint(method="POST")
def simulate(body: dict[str, Any]) -> dict:
    prompt: str = body.get("prompt", "")
    if not prompt.strip():
        raise ValueError("prompt is required")

    # ── TODO: Run your Qwen 3 agent simulation here ───────────────────────────
    #
    # Example using an OpenAI-compatible Qwen endpoint:
    #
    # from openai import OpenAI
    # import os, json
    #
    # client = OpenAI(
    #     api_key=os.environ["QWEN_API_KEY"],
    #     base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
    # )
    #
    # response = client.chat.completions.create(
    #     model="qwen3-235b-a22b",          # or whichever Qwen 3 variant
    #     messages=[
    #         {"role": "system", "content": SYSTEM_PROMPT},
    #         {"role": "user",   "content": prompt},
    #     ],
    #     response_format={"type": "json_object"},
    # )
    # raw = json.loads(response.choices[0].message.content)
    # result = SimulationResult(**raw)
    # return result.model_dump()
    #
    # For parallel agent runs, use modal.Function.spawn() or asyncio.gather()
    # ──────────────────────────────────────────────────────────────────────────

    # Placeholder — remove once real simulation is implemented
    result = SimulationResult(
        aggregate_metrics=AggregateMetrics(
            consumer_price_index=3.2,
            household_real_income=-840,
            employment_impact=-1.4,
            municipal_revenue=290,
        ),
        population_impact={
            "Low Income":    [-8.2, -6.1, -3.4, -1.8, -0.6],
            "Middle Income": [-5.8, -5.4, -4.2, -2.1, -0.7],
            "High Income":   [-2.1, -1.8, -1.4, -1.0, -0.5],
        },
        sectoral_data=[
            SectorItem(name="Retail & Trade", impact=18.2),
            SectorItem(name="Manufacturing",  impact=12.5),
            SectorItem(name="Services",       impact=8.7),
            SectorItem(name="Transportation", impact=6.3),
            SectorItem(name="Finance",        impact=4.1),
            SectorItem(name="Other",          impact=2.8),
        ],
        agent_time_series=[
            TimeSeriesPoint(month="Jan", value=100.0, baseline=100.0),
            TimeSeriesPoint(month="Feb", value=95.2,  baseline=100.2),
            TimeSeriesPoint(month="Mar", value=88.7,  baseline=100.5),
            TimeSeriesPoint(month="Apr", value=83.1,  baseline=100.7),
            TimeSeriesPoint(month="May", value=79.8,  baseline=101.0),
            TimeSeriesPoint(month="Jun", value=78.2,  baseline=101.2),
            TimeSeriesPoint(month="Jul", value=79.5,  baseline=101.5),
            TimeSeriesPoint(month="Aug", value=82.1,  baseline=101.7),
            TimeSeriesPoint(month="Sep", value=85.3,  baseline=102.0),
            TimeSeriesPoint(month="Oct", value=88.7,  baseline=102.2),
            TimeSeriesPoint(month="Nov", value=91.2,  baseline=102.5),
            TimeSeriesPoint(month="Dec", value=93.8,  baseline=102.7),
        ],
        winners=[
            "Municipal government via tariff revenues",
            "Local manufacturers with minimal import exposure",
            "Government employees and pensioners",
        ],
        losers=[
            "Low-income households (8.4% impact on spending)",
            "Import-dependent retailers",
            "Small businesses facing higher input costs",
        ],
    )
    return result.model_dump()
