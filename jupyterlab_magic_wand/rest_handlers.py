import time
from typing import List
from jupyter_server.base.handlers import APIHandler

import tornado
import traceback

from jupyter_server.extension.handler import ExtensionHandlerMixin
from pydantic import BaseModel
from .agents.base import Agent

class AIMagicHandler(ExtensionHandlerMixin, APIHandler):

    @property
    def agents(self) -> List[Agent]:
        return self.settings["agents"]
        
    @property
    def current_agent(self) -> str:
        return self.settings["current_agent"]

    @tornado.web.authenticated
    async def post(self):
        agent_name = self.get_query_argument("agent", self.current_agent)
        agent: Agent = self.agents[agent_name]
        body = self.get_json_body()
        state = agent.state.model_validate(body.get("request"))
        response = await agent.workflow.ainvoke(
            state, 
            config={"jai_config_manager": self.settings.get("jai_config_manager")}
        )
        try:
            # Validate the response.
            response_state = agent.state.model_validate(response)
            self.event_logger.emit(
                schema_id=agent.state_schema_id,
                data=response_state.model_dump()
            )
        except Exception as e:
            await self.handle_exc(e, agent, state)

    async def handle_exc(self,  err: Exception, agent: Agent, state: BaseModel):
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
                state=state.model_dump(),
                error_type=str(err),
                message=exception_string
            )
        )
        

handlers = [
    ("/api/ai/magic", AIMagicHandler)
]