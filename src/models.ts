export type Agent = {
  name: string;
  description: string;
};

export type AgentList = Array<Agent>;

export type AgentConfigResponse = {
  agent_list: AgentList;
  merge_diff: boolean;
  current_agent: Agent;
};
