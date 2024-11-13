from dataclasses import dataclass
from langgraph.graph.graph import CompiledGraph


@dataclass
class Agent:
    name: str
    description: str
    workflow: CompiledGraph
    version: str