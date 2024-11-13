import pathlib
from typing import Dict
from .agents.base import Agent
from importlib_metadata import entry_points

def load_agents_from_entrypoints() -> Dict[str, Agent]:
    """Load agents from entrypoints
    """
    eps = entry_points()
    agents_eps = eps.select(group="jupyter_ai.agents")
    agents = {}
    for eps in agents_eps:
        try:
            agent = eps.load()
            agents[agent.name] = agent
        except Exception as err:
            pass
    return agents


# def load_agents_from_path(path: str | pathlib.Path) -> Dict[str, Agent]:
#     path = pathlib.Path(path)
#     if not path.is_dir():
#         raise Exception("path must be a directory.")
#     path.
#     try:
        
#         src = path.read_text()
#         locals = {"agent": None}
#         exec(src, {}, locals)
#         agents 
        