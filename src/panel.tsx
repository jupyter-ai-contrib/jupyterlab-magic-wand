import * as React from 'react';
import {
  //IThemeManager, 
  ReactWidget
} from '@jupyterlab/apputils';
import { INotebookTracker } from '@jupyterlab/notebook';
import { 
  IAICellTracker,
} from './celltracker';
import { AIPanelComponent } from './components/panel'; './components/panel'
import { AgentConfigResponse } from './models';
import { requestAPI } from './handler';

export const AI_PANEL_COMMAND_ID = "jupyterlab-magic-wand:panel"


export class AIMagicPanelWidget extends ReactWidget {

  _notebookTracker: INotebookTracker;
  _aiCellTracker: IAICellTracker;
  _agentConfig: AgentConfigResponse;

  constructor(
    notebookTracker: INotebookTracker,
    aiCellTracker: IAICellTracker,
    agentConfig: AgentConfigResponse
  ) {
    super();
    this._notebookTracker = notebookTracker;
    this._aiCellTracker = aiCellTracker;
    this._agentConfig = agentConfig;
    // Update this panel if the current cell changed.
    this._notebookTracker.activeCellChanged.connect(() => {
      this.update();
    })
    // Also update if an AI response appeared.
    this._aiCellTracker.responseHappened.connect(() => {
      this.update();
    })
  }

  private async onCurrentAgentChange(newValue: string) {
    await requestAPI("/api/ai/agents", {
      method: "POST",
      body: JSON.stringify({"current_agent": newValue})
    })
  }


  protected render(): JSX.Element {
    return (
      <AIPanelComponent 
      agentList={this._agentConfig.agent_list} 
      currentAgent={this._agentConfig.current_agent}
      onCurrentAgentChange={this.onCurrentAgentChange}
      ></AIPanelComponent>
    )
  }
}