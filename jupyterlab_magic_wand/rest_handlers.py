import json
from typing import List, Optional
import logging
from jupyter_server.base.handlers import APIHandler

import tornado

from jupyter_server.extension.handler import ExtensionHandlerMixin
from .magic_handler import MagicHandler
from .config import ConfigManager
from .state import AIWorkflowState

from .dynamic import dynamic_agent


class AIMagicHandler(ExtensionHandlerMixin, APIHandler):

    @property
    def magic_handler(self) -> MagicHandler:
        return self.settings["magic_handler"]

    @tornado.web.authenticated
    async def post(self):
        body: AIWorkflowState = self.get_json_body()
        await self.magic_handler.on_message(body)

class AgentsHandler(ExtensionHandlerMixin, APIHandler):
    
    @property
    def agents(self) -> dict:
        return self.settings["agents"]

    @tornado.web.authenticated
    def post(self):
        """Link the dynamic agent in the server
        """ 
        data = self.get_json_body()
        path = data["path"]
        agent = dynamic_agent(path)
        self.agents[agent.name] = agent
        
    @tornado.web.authenticated
    def get(self):
        """Return a list of agents
        """
        data = [
            {"name": a.name} #, "description": a.description } 
            for a in self.agents.values()
        ]
        self.write(json.dumps(data))


handlers = [
    ("/api/ai/magic", AIMagicHandler),
    ("/api/ai/agents", AgentsHandler)
]