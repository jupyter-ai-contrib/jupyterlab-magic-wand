# TODO: Lots to do here. This is just a placeholder to get things
# working for a demo.

class ConfigManager:
    
    def __init__(self, agents):
        # Name of the current agent
        self.current_agent = None
        if agents:
            self.current_agent = agents[list(agents.keys())[0]]
        self.merge_diff = True
        self.agents = agents