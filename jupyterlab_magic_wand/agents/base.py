import urllib.parse
from typing import Type
from pydantic import BaseModel, ConfigDict
from langgraph.graph.state import CompiledStateGraph


class Agent(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    name: str
    description: str
    workflow: CompiledStateGraph
    version: str
    state: Type[BaseModel]
    
    @property
    def state_schema_id(self):
        name = urllib.parse.quote_plus(self.name)
        return f"https://events.jupyter.org/jupyter-ai/agents/{name}/state"
    
    @property
    def state_schema(self):
        event_schema = {
            "$id": self.state_schema_id,
            "version": self.version,
            "title": "",
            "description": "",
            "personal-data": True,
            "type": "object",
        }
        event_schema.update(self.state.model_json_schema())
        return event_schema