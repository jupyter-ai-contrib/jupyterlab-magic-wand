import json
from typing import List, Optional
import logging
from jupyter_server.base.handlers import APIHandler

import tornado

from jupyter_server.extension.handler import ExtensionHandlerMixin
from .magic_handler import MagicHandler
from .config import ConfigManager
from .state import AIWorkflowState


class AIMagicHandler(ExtensionHandlerMixin, APIHandler):

    @property
    def magic_handler(self) -> MagicHandler:
        return self.settings["magic_handler"]

    @tornado.web.authenticated
    async def post(self):
        body: AIWorkflowState = self.get_json_body()
        await self.magic_handler.on_message(body)


class AIAgentsHandler(ExtensionHandlerMixin, APIHandler):

    @property
    def ai_config(self) -> ConfigManager:
        return self.settings["ai_config"]

    @tornado.web.authenticated
    async def get(self):
        current = self.ai_config.current_agent
        data = {
            "agent_list": [],
            "current_agent": {
                "name": current.name,
                "description": current.description
            },
        }
        agent_list = []
        for agent in self.settings["agents"].values():
            agent_list.append({
                "name": agent.name,
                "description": agent.description
            })
        data["agent_list"] = agent_list
        self.finish(json.dumps(data))
        
    @tornado.web.authenticated
    async def post(self):
        data = self.get_json_body()
        current_agent = data.get("current_agent")
        if current_agent is not None:
            self.ai_config.current_agent = self.ai_config.agents[current_agent]

class AIFeedbackHandler(ExtensionHandlerMixin, APIHandler):
    
    @property
    def feedback(self) -> logging.Logger:
        return self.settings["feedback"]
    
    @tornado.web.authenticated
    async def post(self):
        data = self.get_json_body()
        helpful:  Optional[bool] = data.get("helpful")
        messages: Optional[List[str]] = data.get("messages")
        input:  Optional[str] = data.get("input")
        agent: List[dict] = data.get("agent")
        data = {
            "input": input,
            "messages": messages,
            "agent": agent,
            "helpful": helpful,
        }
        # Log the feedback
        self.feedback.info(data)


handlers = [
    
    ("/api/ai/magic", AIMagicHandler),
    ("/api/ai/agents", AIAgentsHandler),
    ("/api/ai/feedback", AIFeedbackHandler)
]