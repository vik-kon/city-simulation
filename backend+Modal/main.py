from fastapi import FastAPI, APIRouter, HTTPException, status
from fastapi.responses import Response
from pydantic import BaseModel, Field
import random
import base64
import json
import os
import time
import threading
import traceback
from run_simulation import run_simulation as run_real_simulation

def get_status_agents(status):
    global agent_info
    out = []
    for agent in agent_info:
        if agent["meta"]["group"] == status:
            out.append(agent["agent_id"])
    return out

class RunRequest(BaseModel):
    prompt: str
    num_workers: int = Field(default=1, ge=1, le=40)
class RunResponse(BaseModel):
    response: str
class getDataRequest(BaseModel):
    status: list
    fields : list

class getDataResponse(BaseModel):
    data: dict

class getAgentDataRequest(BaseModel):
    id: str
    fields: list

os.environ['MODAL_API_KEY'] = 'modalresearch_sFETFTxhgkfa06xfXCCFNsYzFhnScMDDnFWn5kRYvsg'

simulating = False
data = {}
agent_info = {}
assumptions = []
last_run_error = None
last_run_traceback = None
"""with open("generated//results.json","r") as f:
    data = json.loads(f.read())
with open("generated//AgentProfiles.json","r") as f:
    agent_info = json.loads(f.read())
with open("generated//Assumptions.json","r") as f:
        assumptions = json.loads(f.read())"""
app = FastAPI(title="HackIllinois Demo API")
router_v1 = APIRouter(prefix="/api/v1", tags=["v1"])

def avg(lst:list):
    if not lst:
        return 0
    total = 0.0
    for item in lst:
        total += float(item)
    return total/len(lst)

def get_status(agent_id:str):
    global agent_info
    for agent in agent_info:
        if agent["agent_id"] == agent_id:
            return agent["meta"]["group"]
        get_initial_states
def get_initial_states(agent_id:str):
    global agent_info
    for agent in agent_info:
        if agent["agent_id"] == agent_id:
            return agent["initial_state"]

def _run_simulation(prompt: str, num_workers: int):
    print("trying run")
    global simulating, data, agent_info, assumptions, last_run_error, last_run_traceback
    try:
        print(f"starting prompt={prompt} workers={num_workers}")
        run_real_simulation(prompt,num_workers)
        with open("generated//results.json","r") as f:
            data = json.loads(f.read())
        with open("generated//AgentProfiles.json","r") as f:
            agent_info = json.loads(f.read())
        with open("generated//Assumptions.json","r") as f:
            assumptions = json.loads(f.read())
        last_run_error = None
        last_run_traceback = None
        print("done")
    except Exception as exc:
        last_run_error = str(exc)
        last_run_traceback = traceback.format_exc()
        print(f"run failed: {exc}")
    finally:
        simulating = False

@router_v1.post("/run", status_code=status.HTTP_202_ACCEPTED)
def run_simulation(item: RunRequest):
    global simulating
    if simulating:
        raise HTTPException(status_code=409, detail="Simulation already running")
    simulating = True
    print("about to try")
    thread = threading.Thread(
        target=_run_simulation,
        args=(item.prompt, item.num_workers),
        daemon=True
    )
    thread.start()
    return {"status": "started", "workers": item.num_workers}


@router_v1.get("/run")
def check_run_status():
    print("STATUS CHECK",simulating)
    return {"simulating": simulating, "error": last_run_error, "traceback": last_run_traceback}

@router_v1.get("/run/error")
def get_run_error():
    return {"error": last_run_error, "traceback": last_run_traceback}

@router_v1.post("/data/bulk")
def get_bulk_data(item: getDataRequest):
    if simulating:
        return getDataResponse(data={})
    output_data = {}
    for field in item.fields:
        output_data[field] = []
    for status in item.status:
        agents = get_status_agents(status)
        print(agents)
        for agent_id in agents:

            initial_values = get_initial_states(agent_id)

            raw_lst = data["trajectories"][agent_id]
            for i in range(len(raw_lst)):
                raw = raw_lst[i]
                print(raw["flags"])
                if not(raw["flags"]["is_dead"] or raw["flags"]["migrated"]):
                    for field in item.fields:
                        if field == "satisfaction":
                            new = float(raw["engine_satisfaction"])
                            
                        elif field == "savings":
                            new = float(raw["state"][field])
                            new = (new - float(initial_values[field]))/float(initial_values[field])
                        else:
                            new = float(raw["state"][field])

                        if i >= len(output_data[field]):
                            output_data[field].append([new])
                        else:
                            output_data[field][i].append(new)
        
    avg_output_data = {}
    for field in item.fields:
        avg_output_data[field] = [avg(step_values) for step_values in output_data[field]]
                            
    return getDataResponse(data=avg_output_data)

@router_v1.post("/agents")
def get_agents():
    if simulating:
        return getDataResponse(data={})
    
    cleaned_agent_info = {}
    for agent in agent_info:
        cleaned_agent_info[agent["agent_id"]] = agent
    return getDataResponse(data=cleaned_agent_info)


@router_v1.post("/data/agents")
def get_agent_data(item: getAgentDataRequest):
    if simulating:
        return getDataResponse(data={})
    output_data = {}
    for field in item.fields:
        output_data[field] = []
    raw_lst = data["trajectories"][item.id]
    initial_values = get_initial_states(item.id)
    for raw in raw_lst:
        if not(raw["flags"]["is_dead"] or raw["flags"]["migrated"]):
            for field in item.fields:
                if field == "satisfaction":
                    new = float(raw["engine_satisfaction"])
                    
                elif field == "savings":
                    new = float(raw["state"][field])
                    new = (new - float(initial_values[field]))/float(initial_values[field])
                else:
                    new = float(raw["state"][field])
                if field == "satisfaction":
                    output_data[field].append(new)
                else:
                    output_data[field].append(new)
    return getDataResponse(data=output_data)
    
@router_v1.get("/data/figures/dead")
def get_dead():
    if simulating:
        return getDataResponse(data={})
    dead_count = 0
    for agent_id in data["trajectories"].keys():
        dead = False
        raw_lst = data["trajectories"][agent_id]
        for raw in raw_lst:
            if raw["flags"]["is_dead"]:
                dead = True
        if dead:
            dead_count+=1
    return getDataResponse(data={"dead":dead_count})
            

@router_v1.get("/data/figures/migrated")
def get_migrant():
    if simulating:
        return getDataResponse(data={})
    migrated_count = 0
    for agent_id in data["trajectories"].keys():
        migrated = False
        raw_lst = data["trajectories"][agent_id]
        for raw in raw_lst:
            if raw["flags"]["migrated"]:
                migrated = True
        if migrated:
            migrated_count+=1
    return getDataResponse(data={"migrated":migrated_count})

@router_v1.get("/data/figures/winner")
def get_winner():
    if simulating:
        return getDataResponse(data={})
    satisfaction_measurments = {"high_income":[],"mid_income":[],"low_income":[],"elite":[]}
    for agent_id in data["trajectories"].keys():
        migrated = False
        raw_lst = data["trajectories"][agent_id]
        last_satisfaction = float(raw_lst[len(raw_lst)-1]["engine_satisfaction"])
        status = get_status(agent_id)
        satisfaction_measurments[status].append(last_satisfaction)
    for key in satisfaction_measurments.keys():
        satisfaction_measurments[key] = avg(satisfaction_measurments[key] )
    
    return getDataResponse(data={"winner":max(satisfaction_measurments, key=satisfaction_measurments.get)})
    

@router_v1.get("/data/figures/loser")
def get_loser():
    if simulating:
        return getDataResponse(data={})
    satisfaction_measurments = {"high_income":[],"mid_income":[],"low_income":[],"elite":[]}
    for agent_id in data["trajectories"].keys():
        migrated = False
        raw_lst = data["trajectories"][agent_id]
        last_satisfaction = float(raw_lst[len(raw_lst)-1]["engine_satisfaction"])
        status = get_status(agent_id)
        satisfaction_measurments[status].append(last_satisfaction)
    for key in satisfaction_measurments.keys():
        satisfaction_measurments[key] = avg(satisfaction_measurments[key] )
    
    return getDataResponse(data={"winner":min(satisfaction_measurments, key=satisfaction_measurments.get)})
    

@router_v1.get("/data/assumptions")
def get_assumptions():
    
    out = []
    for assumption in assumptions:
        out.append(assumption)
    return getDataResponse(data={"assumptions":out})

app.include_router(router_v1)
