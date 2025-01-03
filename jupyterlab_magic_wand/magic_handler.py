"""
A listener class that registers and 'listens' to custom Jupyter events 
that happen when magic wand button response happens.
"""
import pathlib
import time
from uuid import uuid4
from dataclasses import dataclass#, KW_ONLY
import traceback

from jupyter_events.logger import EventLogger
from langchain.prompts import PromptTemplate

from .config import ConfigManager
from .state import AIWorkflowState, ConfigSchema


IMPROVE_STRING_TEMPLATE = """
You are Jupyternaut, a conversational assistant living in JupyterLab to help users.

{input}
"""
    
IMPROVE_PROMPT_TEMPLATE = PromptTemplate(
    input_variables=[
        "input"
    ],
    template=IMPROVE_STRING_TEMPLATE,
)


RESPONSE_SCHEMA_PATH = pathlib.Path(__file__).parent / "events" / "magic-button.yml"
ERROR_SCHEMA_PATH = pathlib.Path(__file__).parent / "events" / "jai-error.yml"


@dataclass
class MagicHandler:
    id: str = "magic"
    name: str = "magic"
    help: str = "Magically improve the following cell."
    uses_llm: bool = True
    # _: KW_ONLY
    event_logger: EventLogger = None
    config: ConfigManager = None
    jupyter_ai_config: any = None

    def __post_init__(self):
        self.event_logger.register_event_schema(RESPONSE_SCHEMA_PATH)
        self.event_logger.register_event_schema(ERROR_SCHEMA_PATH)        

    async def on_message(self, request: AIWorkflowState):
        # If the request gives an agent, use it. Otherwise, use the agent set in config.
        agent_name = request.get("agent") or self.config.current_agent.name
        agent = self.config.agents[agent_name]
        # Ensure these two values are in sync.
        request["agent"] = agent.name
        c: ConfigSchema = {}
        # NOTE: this is hardcoded to be compatible (and take advantage)
        # of Jupyter AI if its available.
        # NOTE: Jupyter AI isn't *required* for the magic wand to work.
        if self.jupyter_ai_config:
            c["jupyter_ai_config"] =  self.jupyter_ai_config
        try:
            response: AIWorkflowState = await agent.workflow.ainvoke(request, config=c)
            self.event_logger.emit(
                schema_id="https://events.jupyter.org/jupyter_ai/magic_button/v1",
                data=response
            )
        except Exception as e:
            await self.handle_exc(e, request)

    async def handle_exc(self,  err: Exception, request: AIWorkflowState):
        exception_string = ""
        try:
            raise err 
        except:
            exception_string = traceback.format_exc()
            
        self.event_logger.emit(
            schema_id="https://events.jupyter.org/jupyter_ai/error/v1",
            data = dict(
                type="Error",
                id='',
                time=time.time(),
                reply_to=request["context"]["cell_id"],
                error_type=str(err),
                message=exception_string
            )
        )