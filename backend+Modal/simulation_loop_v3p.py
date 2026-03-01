import json
from custom_llm_client import callLLM
import random
from concurrent.futures import ThreadPoolExecutor, as_completed

def clamp(x, lo, hi):
    return max(lo, min(hi, x))

def normalize_savings(savings, max_savings):
    if max_savings <= 0:
        return 0.0
    return clamp((savings / max_savings) ** 0.5, 0.0, 1.0)

def compute_satisfaction(state,weights,max_savings):
    components = {
        "savings": normalize_savings(float(state["savings"]), max_savings),
        "hunger": 1.0 - float(state["hunger"]),
        "housing": float(state["housing"]),
        "injured": 1.0 - float(state["injured"]),
        "utility_access": float(state["utility_access"]),
        "education": float(state["education"]),
        "happiness": float(state["happiness"]),
    }

    total_w = sum(max(0.0, float(w)) for w in weights.values())
    if total_w <= 1e-9:
        return 0.5

    score = 0.0
    for k, w in weights.items():
        score += max(0.0, float(w)) * components.get(k, 0.0)

    return clamp(score / total_w, 0.0, 1.0)

CATEGORIES = ["food", "housing", "healthcare", "utilities", "education", "happiness"]

def parse_action(llm_text):
    return json.loads(llm_text)

def _scale_allocations(alloc, factor):
    return {k: float(v) * factor for k, v in alloc.items()}

def validate_and_fix_action(action,state,daily_income,simspec,migration_cost):
    warnings= []

    if "allocations" not in action:
        warnings.append("missing:allocations")
    if "migrate" not in action:
        warnings.append("missing:migrate")

    action.setdefault("allocations", {})
    action.setdefault("migrate", 0)

    action = {
        "allocations": action["allocations"],
        "migrate": action["migrate"],
    }

    try:
        action["migrate"] = 1 if int(action["migrate"]) == 1 else 0
    except Exception:
        warnings.append("migrate_parse_failed")
        action["migrate"] = 0

    alloc_in = action["allocations"] if isinstance(action["allocations"], dict) else {}
    sanitized_alloc = {}
    for cat in CATEGORIES:
        try:
            v = float(alloc_in.get(cat, 0.0))
        except Exception:
            warnings.append(f"{cat}_parse_failed")
            v = 0.0
        if v < 0:
            warnings.append(f"{cat}<0_clamped")
            v = 0.0
        sanitized_alloc[cat] = v
    action["allocations"] = sanitized_alloc

    max_daily_spend = float(simspec["constraints"]["action_limits"]["max_daily_spend"])
    total_spend = sum(sanitized_alloc.values())
    if total_spend > max_daily_spend + 1e-9 and total_spend > 1e-12:
        factor = max_daily_spend / total_spend
        action["allocations"] = _scale_allocations(sanitized_alloc, factor)
        warnings.append("total_spend>max_daily_spend_scaled")
        sanitized_alloc = action["allocations"]
        total_spend = sum(sanitized_alloc.values())
    available = float(state.get("savings", 0.0)) + float(daily_income)
    if total_spend > available + 1e-9 and total_spend > 1e-12:
        factor = available / total_spend
        action["allocations"] = _scale_allocations(sanitized_alloc, factor)
        warnings.append("total_spend>available_scaled")
        sanitized_alloc = action["allocations"]
        total_spend = sum(sanitized_alloc.values())





    if action["migrate"] == 1 and float(state.get("savings", 0.0)) < float(migration_cost):
        action["migrate"] = 0
        warnings.append("migrate_unaffordable_forced_0")

    return action, warnings
def apply_baseline_decay(state, decay):
    dh = max(0.0, float(decay.get("hunger", 0.0)))
    di = max(0.0, float(decay.get("injured", 0.0)))
    dho = max(0.0, float(decay.get("housing", 0.0)))
    dha = max(0.0, float(decay.get("happiness", 0.0)))

    state["hunger"] = clamp(float(state["hunger"]) + dh, 0.0, 1.0)
    state["injured"] = clamp(float(state["injured"]) + di + random.randint(-15, 15) / 100, 0.0, 1.0)
    state["housing"] = clamp(float(state["housing"]) - dho, 0.0, 1.0)
    state["happiness"] = clamp(float(state["happiness"]) - dha, 0.0, 1.0)

def apply_spend_effects(state,action,simspec, personality):
    spend_effects = simspec["dynamics"]["spend_effects"]
    prices = simspec["institutions"]["price_tables"]
    dollar_impacts = personality["dollar_impacts"]

    util_cost = float(prices["utilities"]["unit_cost"])
    edu_cost = float(prices["education"]["unit_cost"])
    util_spend = float(action["allocations"].get("utilities", 0.0))
    edu_spend = float(action["allocations"].get("education", 0.0))

    if util_cost > 0:
        state["utility_access"] = 1 if util_spend >= util_cost else 0
    else:
        state["utility_access"] = 1 if util_spend > 0 else int(state.get("utility_access", 0))

    if edu_cost > 0:
        state["education"] = 1 if edu_spend >= edu_cost else 0
    else:
        state["education"] = 1 if edu_spend > 0 else int(state.get("education", 0))

    for cat, dollars in action["allocations"].items():
        dollars = float(dollars)
        if dollars <= 0:
            continue

        k = float(spend_effects[cat]["k"])
        target = spend_effects[cat]["target"]
        eff = float(dollar_impacts.get(cat, 1.0))
        unit_cost = float(prices[cat]["unit_cost"])

        units = dollars / unit_cost if unit_cost > 0 else dollars
        delta = k * eff * units

        if target in ["hunger", "housing", "injured", "happiness"]:
            state[target] = clamp(float(state[target]) + delta, 0.0, 1.0)

def apply_finances(state,action,daily_income):
    total_spend = sum(float(v) for v in action["allocations"].values())
    state["savings"] = float(state.get("savings", 0.0)) + float(daily_income) - total_spend
    state["savings"] = max(0.0, state["savings"])

def apply_migration_if_any(state,action,migration_cost):
    if int(action.get("migrate", 0)) != 1:
        return False
    if float(state.get("savings", 0.0)) < float(migration_cost):

        return False

    state["savings"] = float(state["savings"]) - float(migration_cost)
    state["housing"] = clamp(float(state["housing"]) + 0.05, 0.0, 1.0)
    state["happiness"] = clamp(float(state["happiness"]) + 0.03, 0.0, 1.0)
    return True

def apply_emergency_healthcare_if_needed(state,simspec,threshold= 0.8,post_heal= 0.2):
    if float(state.get("injured", 0.0)) < threshold:
        return False

    er_cost = float(simspec["institutions"]["price_tables"]["healthcare"]["unit_cost"])
    if float(state.get("savings", 0.0)) >= er_cost:
        state["savings"] = float(state["savings"]) - er_cost
    else:
        state["savings"] = 0.0

    state["injured"] = clamp(post_heal, 0.0, 1.0)
    return True

def build_friend_graph(agent_profiles):
    ids = {ap.get("agent_id") for ap in agent_profiles if isinstance(ap.get("agent_id"), str)}
    graph = {}
    for ap in agent_profiles:
        aid = ap.get("agent_id")
        if not isinstance(aid, str):
            continue
        raw = ap.get("linked_agents", [])
        friends= []
        if isinstance(raw, list):
            for x in raw:
                if isinstance(x, str) and x in ids and x != aid and x not in friends:
                    friends.append(x)
        graph[aid] = friends[:3]
    return graph

def apply_social_influence(runtime_states,sats,friend_graph,social_alpha= 0.03,social_cap = 0.05):
    incoming = {aid: 0.0 for aid in runtime_states.keys()}

    for src, friends in friend_graph.items():
        src_sat = float(sats.get(src, 0.5))
        centered = src_sat - 0.5
        if abs(centered) < 1e-9:
            continue
        for dst in friends:
            mag = random.uniform(0.0, social_alpha)
            incoming[dst] = incoming.get(dst, 0.0) + mag * centered

    for aid, delta in list(incoming.items()):
        delta = clamp(delta, -social_cap, social_cap)
        st = runtime_states.get(aid)
        if st is None:
            continue
        st["happiness"] = clamp(float(st["happiness"]) + delta, 0.0, 1.0)
        incoming[aid] = delta

    return incoming
def build_agent_step_prompt(agent_id,t, state, personality, daily_income, migration_cost, prices, last_action, notes):
    step_input = {
        "t": int(t),
        "daily_income": float(daily_income),
        "migration_cost": float(migration_cost),
        "state": {
            "savings": float(state["savings"]),
            "hunger": float(state["hunger"]),
            "housing": float(state["housing"]),
            "injured": float(state["injured"]),
            "utility_access": int(state["utility_access"]),
            "education": int(state["education"]),
            "happiness": float(state["happiness"]),
        },
        "prices": {k: float(v["unit_cost"]) for k, v in prices.items()},
        "personality": personality,
        "last_action": last_action,
        "notes": notes,
        "agent_id": agent_id
    }
    return json.dumps(step_input)

def _call_agent_llm(agent_system_prompt, step_payload):
    return callLLM(agent_system_prompt + "\n\n" + step_payload, type="heavy")

def _extract_json_from_llm_text(llm_text):
    try:
        return llm_text.split("think>\n")[2]
    except Exception:
        i = llm_text.find("{")
        return llm_text[i:] if i >= 0 else llm_text

def simulate(simspec, agent_profiles, agent_system_prompt, callLLM=callLLM,migration_cost = 0.0, max_workers = None,social_alpha = 0.03,social_cap = 0.05):

    num_steps = int(simspec["time"]["num_steps"])
    prices = simspec["institutions"]["price_tables"]
    max_savings = float(simspec["constraints"]["state_bounds"]["savings"]["max"])
    death_thresh = float(simspec["constraints"]["terminal"]["death_injured_threshold"])

    trajectories = {}
    warnings_log = {}

    runtime_states = {}
    personalities = {}
    decays = {}
    incomes= {}

    for ap in agent_profiles:
        aid = ap["agent_id"]
        runtime_states[aid] = dict(ap["initial_state"])
        personalities[aid] = ap["personality"]
        decays[aid] = dict(ap["baseline_decay"])
        incomes[aid] = float(ap["daily_income"])
        trajectories[aid] = []
        warnings_log[aid] = []
    friend_graph = build_friend_graph(agent_profiles)
    num_steps = 4

    if max_workers is None:
        max_workers = min(32, max(1, len(agent_profiles)))

    for t in range(num_steps):
        jobs = {}
        dead_now = set()
        last_actions = {}

        for ap in agent_profiles:
            aid = ap["agent_id"]
            state = runtime_states[aid]

            if float(state["injured"]) >= death_thresh:
                dead_now.add(aid)
                continue

            last_action = trajectories[aid][-1]["action"] if trajectories[aid] else None
            last_actions[aid] = last_action

            step_payload = build_agent_step_prompt(
                agent_id=aid,
                t=t,
                state=state,
                personality=personalities[aid],
                daily_income=incomes[aid],
                migration_cost=migration_cost,
                prices=prices,
                last_action=last_action,
                notes=""
            )
            jobs[aid] = step_payload
        llm_outputs = {}

        with ThreadPoolExecutor(max_workers=max_workers) as ex:
            futures = {
                ex.submit(_call_agent_llm, agent_system_prompt, payload): aid
                for aid, payload in jobs.items()
            }

            for fut in as_completed(futures):
                aid = futures[fut]
                try:
                    llm_outputs[aid] = fut.result()
                except Exception as e:
                    warnings_log[aid].append(f"t={t}:llm_call_failed:{type(e).__name__}")
                    llm_outputs[aid] = (
                        '{"allocations":{"food":0,"housing":0,"healthcare":0,"utilities":0,"education":0,"happiness":0},"migrate":0}'
                    )
        actions = {}
        migrated_flags = {}

        for ap in agent_profiles:
            aid = ap["agent_id"]
            state = runtime_states[aid]

            if aid in dead_now:
                actions[aid] = None
                migrated_flags[aid] = False
                continue

            pers = personalities[aid]
            decay = decays[aid]
            daily_income = incomes[aid]

            llm_text = llm_outputs.get(aid, "")

            llm_json = _extract_json_from_llm_text(llm_text)
            try:
                action_raw = parse_action(llm_json)
            except Exception:
                warnings_log[aid].append(f"t={t}:action_json_parse_failed")
                action_raw = {"allocations": {}, "migrate": 0}

            action, warns = validate_and_fix_action(
                action_raw,
                state=state,
                daily_income=daily_income,
                simspec=simspec,
                migration_cost=migration_cost
            )
            if warns:
                warnings_log[aid].extend([f"t={t}:{w}" for w in warns])

            _ = apply_emergency_healthcare_if_needed(state, simspec)
            apply_finances(state, action, daily_income)
            apply_baseline_decay(state, decay)
            apply_spend_effects(state, action, simspec, pers)
            migrated = apply_migration_if_any(state, action, migration_cost)

            actions[aid] = action
            migrated_flags[aid] = migrated





        sats_pre = {}
        for ap in agent_profiles:
            aid = ap["agent_id"]
            if aid in dead_now:
                sats_pre[aid] = 0.0
            else:
                sats_pre[aid] = compute_satisfaction(runtime_states[aid],personalities[aid]["satisfaction_weights"],max_savings)

        _incoming = apply_social_influence(runtime_states, sats_pre, friend_graph,social_alpha=social_alpha, social_cap=social_cap)
        for ap in agent_profiles:
            aid = ap["agent_id"]
            state = runtime_states[aid]

            if aid in dead_now:
                trajectories[aid].append({
                    "t": int(t),
                    "state": dict(state),
                    "action": None,
                    "engine_satisfaction": 0.0,
                    "flags": {"is_dead": True, "migrated": False}
                })
                continue

            engine_sat = compute_satisfaction(state, personalities[aid]["satisfaction_weights"], max_savings)

            trajectories[aid].append({
                "t": int(t),
                "state": dict(state),
                "action": actions[aid],
                "engine_satisfaction": float(engine_sat),
                "flags": {"is_dead": False, "migrated": bool(migrated_flags.get(aid, False))}
            })
    final_sats = []
    for ap in agent_profiles:
        aid = ap["agent_id"]
        if trajectories[aid]:
            final_sats.append(float(trajectories[aid][-1]["engine_satisfaction"]))

    aggregates = {
        "mean_final_satisfaction": sum(final_sats) / len(final_sats) if final_sats else 0.0,
        "min_final_satisfaction": min(final_sats) if final_sats else 0.0,
        "max_final_satisfaction": max(final_sats) if final_sats else 0.0
    }

    return {
        "trajectories": trajectories,
        "aggregates": aggregates,
        "warnings": warnings_log
    }