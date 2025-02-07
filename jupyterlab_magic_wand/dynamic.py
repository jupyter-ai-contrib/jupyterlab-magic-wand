import pathlib
import importlib.util
import sys
import logging

from .agents.base import Agent

log = logging.getLogger()


def dynamic_agent(fpath) -> Agent:
    stem = pathlib.Path(fpath).stem
    spec = importlib.util.spec_from_file_location(stem, fpath)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[stem] = mod
    spec.loader.exec_module(mod)
    try:
        agent = mod.agent
        return agent
    except:
        log.error("When loading a dynamic agent file, no `agent` argument was found.")