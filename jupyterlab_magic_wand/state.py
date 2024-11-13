"""
The (custom) state that a Jupyter AI Workflow expects. 

Each registered workflow can also register a custom 
state dict. It MUST be JSON serializable.
"""
from typing import Optional, List
from typing_extensions import TypedDict


class ConfigSchema(TypedDict):
    # Known models we can use.
    models: dict

    
class LabCommand(TypedDict):
    name: str
    args: Optional[dict]
    
    
class AIWorkflowState(TypedDict):
    agent: str
    input: Optional[str]
    context: dict
    messages: List[str]
    commands: List[LabCommand]
