import json
import os
import re
from custom_llm_client import callLLM
from simulation_loop_v3p import simulate
import random

def _extract_json(text):
    return json.loads(text)

def generate_inputs_with_planner(user_scenario, num_agents):
    with open("prompts//planner_prompt_v3.txt", "r") as f:
        planner_prompt_template = f.read()
    print("1")
    planner_prompt = (
        planner_prompt_template
        .replace("{{USER_SCENARIO}}", user_scenario)
        .replace("{{NUM_AGENTS}}", str(num_agents))
    )
    print("2")
    planner_text = callLLM(
        prompt=planner_prompt,
        system_prompt=None,      
        max_tokens=30000,
        temperature=0.1,
        type="heavy"
    )
    
    with open("planner_text.txt","w") as f:
        json.dump(planner_text,f)

    planner_text = planner_text.split("think>\n")[2]

    planner_obj = extract_json_from_llm(planner_text)
    for k in ["SimSpec", "ActionSchema", "AgentProfiles", "Assumptions"]:
        if k not in planner_obj:
            raise ValueError(f"Planner output missing key: {k}")
    if len(planner_obj["AgentProfiles"]) != num_agents:
        raise ValueError(
            f"Planner returned {len(planner_obj['AgentProfiles'])} agents, expected {num_agents}"

        )

    return planner_obj








def extract_json_from_llm(raw_text):
    raw_text = raw_text.strip()

    if raw_text.startswith("```"):
        raw_text = re.sub(r"^```json\s*", "", raw_text)
        raw_text = re.sub(r"^```", "", raw_text)
        raw_text = re.sub(r"```$", "", raw_text)

    raw_text = raw_text.strip()
    if raw_text.startswith('"') and raw_text.endswith('"'):
        raw_text = json.loads(raw_text)

    return json.loads(raw_text)

def scale_constraints(planner_obj):
    for ap in planner_obj["AgentProfiles"]:
        income = ap["daily_income"]
        decay = ap["baseline_decay"]
        impacts = ap["personality"]["dollar_impacts"]
        status = ap["meta"]["group"]
        dollars = 0

        
        dollars += decay["hunger"]/impacts["food"]
        dollars += decay["housing"]/impacts["housing"]
        dollars += decay["injured"]/impacts["healthcare"]
        dollars += decay["happiness"]/impacts["happiness"]
    
        mult = 1
        if status == "elite":
            mult = (10*dollars/income)/(random.randint(10,25))
        if status == "high_income":
            mult = (10*dollars/income)/(random.randint(40,55))
        if status == "mid_income":
            mult = (10*dollars/income)/(random.randint(55,90))
        if status == "low_income":
            mult = (10*dollars/income)/(random.randint(90,105))
        for key in impacts.keys():
            impacts[key] = impacts[key]*mult

        if impacts["food"] < max(100*impacts["healthcare"],100*impacts["housing"],100*impacts["utilities"]):
            impacts["food"] = max(100*impacts["healthcare"],100*impacts["housing"],100*impacts["utilities"])
        if impacts["happiness"] < max(100*impacts["healthcare"],100*impacts["housing"],100*impacts["utilities"]):
            impacts["happiness"] = max(100*impacts["healthcare"],100*impacts["housing"],100*impacts["utilities"])

        impacts["healthcare"] = 0.0005
        ap["personality"]["dollar_impacts"] = impacts
        ap["baseline_decay"] = decay
    return planner_obj


def save_json_files(planner_obj):
    os.makedirs("generated", exist_ok=True)
    with open("generated/SimSpec.json", "w") as f:
        json.dump(planner_obj["SimSpec"], f, indent=2)
    with open("generated/Action.schema.json", "w") as f:
        json.dump(planner_obj["ActionSchema"], f, indent=2)
    with open("generated/AgentProfiles.json", "w") as f:
        json.dump(planner_obj["AgentProfiles"], f, indent=2)

    with open("generated/Assumptions.json", "w") as f:
        json.dump(planner_obj["Assumptions"], f, indent=2)


def run_simulation(user_scenario, num_agents):
    planner_obj = generate_inputs_with_planner(user_scenario, num_agents)
    planner_obj = scale_constraints(planner_obj)
    save_json_files(planner_obj)
    with open("generated/SimSpec.json", "r") as f:
        simspec = json.load(f)
    with open("generated/AgentProfiles.json", "r") as f:
        agent_profiles = json.load(f)
    with open("prompts//agent_prompt_v3.txt", "r") as f:
        agent_system_prompt = f.read()
    results = simulate(
        simspec=simspec,
        agent_profiles=agent_profiles,
        agent_system_prompt=agent_system_prompt,
        callLLM=callLLM
    )
    with open("generated/results.json", "w") as f:
        json.dump(results, f, indent=2)