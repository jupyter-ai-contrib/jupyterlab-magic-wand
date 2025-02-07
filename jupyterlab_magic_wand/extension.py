import logging
import pathlib
from traitlets import Instance, Dict, Unicode, default
from jupyter_server.extension.application import ExtensionApp
from jupyter_core.paths import jupyter_data_dir

from .magic_handler import MagicHandler
from .rest_handlers import handlers
from importlib_metadata import entry_points
from .config import ConfigManager


# DEFAULT_CUSTOM_AGENT_DIR = str(pathlib.Path(jupyter_data_dir()) / "agents")


class AIMagicExtension(ExtensionApp):  
    name = "jupyterlab_magic_wand"
    handlers = handlers
    
    magic_handler = Instance(MagicHandler, allow_none=True)
    ai_config = Instance(ConfigManager, allow_none=True)
    agents = Dict(key_trait=Unicode, value_trait=Instance(object))
    feedback = Instance(logging.Logger, allow_none=True)

    # custom_agent_dir = Unicode(DEFAULT_CUSTOM_AGENT_DIR.st).tag(config=True)

    def initialize_settings(self):
        eps = entry_points()
        agents_eps = eps.select(group="jupyterlab_magic_wand.agents")
        for eps in agents_eps:
            try:
                agent = eps.load()
                self.agents[agent.name] = agent
                self.log.error(f"Successfully loaded workflow: {agent.name}")
            except Exception as err:
                self.log.error(err)
                self.log.error(f"Unable to load {agent.name}")
        
        self.ai_config = ConfigManager(self.agents)
        self.magic_handler = MagicHandler(
            event_logger=self.serverapp.event_logger,
            config=self.ai_config,
            jupyter_ai_config=self.settings["jai_config_manager"]
        )
        self.settings.update({
            "magic_handler": self.magic_handler,
            "agents": self.agents,
            "ai_config": self.ai_config,
            "feedback": self.feedback
        })