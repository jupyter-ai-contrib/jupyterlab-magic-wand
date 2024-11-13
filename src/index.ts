import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IEventListener, EventListener } from './token';
import { INotebookTracker } from '@jupyterlab/notebook';
import { 
  AICellTracker, 
  IAICellTracker, 
  // responseHandledData 
} from './celltracker'; 
// import { MagicDiffWidget } from './components/cellinputfooter';
import { IThemeManager } from '@jupyterlab/apputils';
import { wandIcon } from './icon';
import { AI_PANEL_COMMAND_ID, AIMagicPanelWidget } from './panel';
import { requestAPI } from './handler';
import { AgentConfigResponse } from './models';
import { 
  findCell,
} from './utils';

import { executeDiffCommand } from './diff';
import { executeFeedbackCommand } from './feedback';

const PLUGIN_ID = "jupyterlab-magic-wand";

const eventlistener: JupyterFrontEndPlugin<EventListener> = {
  id: PLUGIN_ID + ":eventlistener",
  description: "An API for listening to events coming off of JupyterLab's event manager.",
  autoStart: true,
  provides: IEventListener,
  activate: async (
    app: JupyterFrontEnd, 
    notebookTracker: INotebookTracker,
    settingRegistry: ISettingRegistry | null,
  ) => {
    console.log(`Jupyter Magic Wand plugin extension activated: ${PLUGIN_ID}:eventlistener`);
    await app.serviceManager.ready;
    let eventListener = new EventListener(app.serviceManager.events);
    return eventListener;

  }
};


const agentCommands: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID + ":agentCommands",
  description: 'A set of custom commands that AI agents can use.',
  autoStart: true,
  requires: [INotebookTracker],
  activate: async (
    app: JupyterFrontEnd, 
    notebookTracker: INotebookTracker,
  ) => {
    console.log(`Jupyter Magic Wand plugin extension activated: ${PLUGIN_ID}:agentCommands`);
    app.commands.addCommand(
      'insert-cell-below', 
      {
        execute: (args) => {
          let data = (args as any);
          let cellId = data["cell_id"];
          let newCellId = data["new_cell_id"] || undefined;
          let cellType = data["cell_type"]
          if (cellId) {
            let { notebook } = findCell(cellId, notebookTracker);
            let idx = notebook?.model?.sharedModel.cells.findIndex((cell) => { 
              return cell.getId() == cellId 
            })
            if (idx !== undefined && idx >= 0) {
              let newCell = notebook?.model?.sharedModel.insertCell(
                idx + 1, {
                  cell_type: cellType,
                  metadata: {},
                  id: newCellId
                })
              if (data["source"]) {
                // Add the source to the new cell;
                newCell?.setSource(data["source"]);
                // Post an update to ensure that notebook gets rerendered.
                notebook?.update();     
              }
            }
          }
        }
      }
    )
    app.commands.addCommand(
      'update-cell-source', 
      {
        execute: (args) => {
          let data = (args as any);
          let cellId = data["cell_id"];
          if (cellId) {
            let { notebook } = findCell(cellId, notebookTracker);
            let cell = notebook?.model?.sharedModel.cells.find((cell) => { 
              return cell.getId() == cellId
            })
            if (cell) {
              if (data["source"]) {
                // Add the source to the new cell;
                cell?.setSource(data["source"]);
                // Post an update to ensure that notebook gets rerendered.
                notebook?.update();
                notebook?.content.update();
              }
            }
          }
        }
      }
    )
    app.commands.addCommand(
      'track-if-editted', 
      {
        execute: async (args) => {
          let data = (args as any);
          let cellId = data["cell_id"];
          // don't do anything if no cell_id was given.
          if (!cellId) {
            return;
          }

          let { cell, notebook } = findCell(cellId, notebookTracker);
          if (cell === undefined) {
            return;  
          }
          await cell.ready;

          let sharedCell = notebook?.model?.sharedModel.cells.find((cell) => { 
            return cell.getId() == cellId
          })
          if (sharedCell === undefined) {
            return;
          }

          function updateMetadata(editted: boolean = false) {
            let metadata: object = {}
            try {
              metadata = cell?.model.getMetadata("jupyter_ai") || {}
            } catch {
              metadata = {}
            }
            let newMetadata = {
              ...metadata,
              editted: editted
            }
            // cell?.model.sharedModel.me
            cell?.model.setMetadata("jupyter_ai", newMetadata);
          }
          updateMetadata(false);
          let updateAIEditedField = function() {
            updateMetadata(true);
            sharedCell?.changed.disconnect(updateAIEditedField);
          }
          sharedCell?.changed.connect(updateAIEditedField);
        }
      }
    )

  }
}

/**
 * Initialization data for the jupyterlab-magic-wand extension.
 */
const plugin: JupyterFrontEndPlugin<IAICellTracker> = {
  id: PLUGIN_ID + ":aicelltracker",
  description: 'A cell tracker for the magic wand button.',
  autoStart: true,
  requires: [INotebookTracker, IEventListener],
  provides: IAICellTracker,
  activate: async (
    app: JupyterFrontEnd, 
    notebookTracker: INotebookTracker,
    eventListener: IEventListener
  ) => {
    console.log(`Jupyter Magic Wand plugin extension activated: ${PLUGIN_ID}:tracker`);
    await app.serviceManager.ready;
    let aiCellTracker = new AICellTracker(
      app.commands,
      notebookTracker,
      eventListener
    );
  
    // Add a keyboard shortcut.
    app.commands.addKeyBinding({
      command: aiCellTracker.commandId,
      args: {},
      keys: ['Shift Cmd M'],
      selector: '.jp-Notebook'
    });

    return aiCellTracker;
  }
};


const mergeview: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID + ":mergeview",
  description: 'An in-cell diff viewer.',
  requires: [INotebookTracker, IAICellTracker],
  autoStart: true,
  activate: async (
    app: JupyterFrontEnd, 
    notebookTracker: INotebookTracker,
    aiCellTracker: IAICellTracker,
    settingRegistry: ISettingRegistry | null,
  ) => {
    console.log(`Jupyter Magic Wand plugin extension activated: ${PLUGIN_ID}:mergeview`);
    await app.serviceManager.ready;

    app.commands.addCommand(
      'show-diff', 
      {
        execute: executeDiffCommand(notebookTracker)
      }
    )
  }
};


const feedback: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID + ":feedback",
  description: 'A plugin to request feedback from the user.',
  requires: [INotebookTracker, IAICellTracker],
  autoStart: true,
  activate: async (
    app: JupyterFrontEnd, 
    notebookTracker: INotebookTracker,
    aiCellTracker: IAICellTracker,
    settingRegistry: ISettingRegistry | null,
  ) => {
    console.log(`Jupyter Magic Wand plugin extension activated: ${PLUGIN_ID}:feedback`);
    await app.serviceManager.ready;

    app.commands.addCommand(
      'request-feedback', 
      {
        execute: executeFeedbackCommand(notebookTracker)
      }
    )
  }
};


const sidepanel: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID + ":aisidepanel",
  description: 'A side panel for configuring an AI assistant.',
  autoStart: true,
  optional: [ISettingRegistry],
  requires: [INotebookTracker, IAICellTracker, IThemeManager],
  activate: async (
    app: JupyterFrontEnd, 
    notebookTracker: INotebookTracker,
    aiCellTracker: IAICellTracker,
    themeManager: IThemeManager,
    settingRegistry: ISettingRegistry | null,
  ) => {
    console.log(`Jupyter Magic Wand plugin extension activated: ${PLUGIN_ID}:panel`);
    await app.serviceManager.ready;

    // Make the request.
    let agentConfig: AgentConfigResponse = await requestAPI("/api/ai/agents");

    // new PulseStatusBarWidget(statusBar, heartbeat);
    let panel = new AIMagicPanelWidget(
      notebookTracker,
      aiCellTracker,
      agentConfig
    );

    // If the theme changes, update this widget.
    themeManager.themeChanged.connect(() => {
      panel.update();
    });

    panel.title.icon = wandIcon;
    panel.id = 'ai-magic';
    panel.title.caption = 'AI Magic';
    app.shell.add(panel, 'right');
    app.commands.addCommand(AI_PANEL_COMMAND_ID, {
      label: 'Open AI Magic Panel',
      isEnabled: () => true,
      isVisible: () => true,
      execute: () => {
        // Show the side panel.
        panel.parent?.setHidden(false);
        panel.setHidden(false);
      }
    });

  }
};

export default [eventlistener, agentCommands, plugin, mergeview, feedback, sidepanel];