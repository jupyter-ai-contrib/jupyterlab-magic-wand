import logging
from traitlets import Instance, Dict, Unicode, default
from jupyter_server.extension.application import ExtensionApp

from .rest_handlers import handlers
from importlib_metadata import entry_points
from .agents.base import Agent


class AIMagicExtension(ExtensionApp):  
    name = "jupyterlab_magic_wand"
    handlers = handlers
    
    agents = Dict(key_trait=Unicode, value_trait=Instance(object))
    default_agent = Unicode(
        default_value="Magic Button Agent",
        help=(
            "The name of the default agent, if an agent is not "
            "explicitly named when a request is made to the server."
        )
    ).tag(config=True)

    def initialize_settings(self):
        eps = entry_points()
        agents_eps = eps.select(group="jupyterlab_magic_wand.agents")
        for eps in agents_eps:
            try:
                agent: Agent = eps.load()
                self.agents[agent.name] = agent
                import json
                self.serverapp.event_logger.register_event_schema(agent.state_schema)
                self.log.info(f"Successfully loaded agent: {agent.name}")
            except Exception as err:
                self.log.error(err)
                self.log.error(f"Unable to load {agent.name}")
                
        self.settings.update({
            "agents": self.agents,
            "current_agent": self.default_agent
        })
