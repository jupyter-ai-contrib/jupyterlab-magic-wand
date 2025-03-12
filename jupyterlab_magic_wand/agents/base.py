import urllib.parse
from typing import Type
from pydantic import BaseModel
from langgraph.graph.state import CompiledStateGraph


class Agent(BaseModel):
    name: str
    description: str
    workflow: CompiledStateGraph
    version: str
    request: Type[BaseModel]
    response: Type[BaseModel]
    
    @property
    def response_schema_id(self):
        name = urllib.parse.quote_plus(self.name)
        return f"https://events.jupyter.org/jupyter-ai/agents/{name}/response"
    
    @property
    def response_schema(self):
        event_schema = {
            "$id": self.response_schema_id,
            "version": self.version,
            "title": "",
            "description": "",
            "personal-data": True,
            "type": "object",
        }
        event_schema.update(self.response.model_json_schema())
        return event_schema