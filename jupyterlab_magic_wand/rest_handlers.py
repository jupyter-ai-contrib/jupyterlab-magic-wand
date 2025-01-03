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

handlers = [
    ("/api/ai/magic", AIMagicHandler)
]