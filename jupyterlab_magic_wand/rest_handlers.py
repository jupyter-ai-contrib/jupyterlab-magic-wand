import time
from typing import List
from jupyter_server.base.handlers import APIHandler

import tornado
import traceback

from jupyter_server.extension.handler import ExtensionHandlerMixin
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
        body = self.get_json_body()
        agent_name: Agent = body.get("agent", self.current_agent)
        agent = self.agents[agent_name]
        request = agent.request.model_validate(body.get("request"))
        try:
            response = await agent.workflow.ainvoke(request)
            self.event_logger.emit(
                schema_id="https://events.jupyter.org/jupyter_ai/magic_button/v1",
                data=response
            )
        except Exception as e:
            await self.handle_exc(e, request)

    async def handle_exc(self,  err: Exception, request: any):
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
        

handlers = [
    ("/api/ai/magic", AIMagicHandler)
]