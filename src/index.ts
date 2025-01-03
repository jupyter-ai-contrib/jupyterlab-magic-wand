import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { INotebookTracker } from '@jupyterlab/notebook';
import {
  AICellTracker,
  IAICellTracker
  // responseHandledData
} from './celltracker';

import { findCell } from './utils';

// import { executeFeedbackCommand } from './feedback';
import { IEventListener } from 'jupyterlab-eventlistener';
import { ICellFooterTracker } from 'jupyterlab-cell-input-footer';

const PLUGIN_ID = 'jupyterlab_magic_wand';

const agentCommands: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID + ':agentCommands',
  description: 'A set of custom commands that AI agents can use.',
  autoStart: true,
  requires: [INotebookTracker],
  activate: async (app: JupyterFrontEnd, notebookTracker: INotebookTracker) => {
    console.log(
      `Jupyter Magic Wand plugin extension activated: ${PLUGIN_ID}:agentCommands`
    );
    app.commands.addCommand('insert-cell-below', {
      execute: args => {
        const data = args as any;
        const cellId = data['cell_id'];
        const newCellId = data['new_cell_id'] || undefined;
        const cellType = data['cell_type'];
        if (cellId) {
          const { notebook } = findCell(cellId, notebookTracker);
          const idx = notebook?.model?.sharedModel.cells.findIndex(cell => {
            return cell.getId() === cellId;
          });
          if (idx !== undefined && idx >= 0) {
            const newCell = notebook?.model?.sharedModel.insertCell(idx + 1, {
              cell_type: cellType,
              metadata: {},
              id: newCellId
            });
            if (data['source']) {
              // Add the source to the new cell;
              newCell?.setSource(data['source']);
              // Post an update to ensure that notebook gets rerendered.
              notebook?.update();
            }
          }
        }
      }
    });
    app.commands.addCommand('update-cell-source', {
      execute: args => {
        const data = args as any;
        const cellId = data['cell_id'];
        if (cellId) {
          const { notebook } = findCell(cellId, notebookTracker);
          const cell = notebook?.model?.sharedModel.cells.find(cell => {
            return cell.getId() === cellId;
          });
          if (cell) {
            if (data['source']) {
              // Add the source to the new cell;
              cell?.setSource(data['source']);
              // Post an update to ensure that notebook gets rerendered.
              notebook?.update();
              notebook?.content.update();
            }
          }
        }
      }
    });
    app.commands.addCommand('track-if-editted', {
      execute: async args => {
        const data = args as any;
        const cellId = data['cell_id'];
        // don't do anything if no cell_id was given.
        if (!cellId) {
          return;
        }

        const { cell, notebook } = findCell(cellId, notebookTracker);
        if (cell === undefined) {
          return;
        }
        await cell.ready;

        const sharedCell = notebook?.model?.sharedModel.cells.find(cell => {
          return cell.getId() === cellId;
        });
        if (sharedCell === undefined) {
          return;
        }

        function updateMetadata(editted: boolean = false) {
          let metadata: object = {};
          try {
            metadata = cell?.model.getMetadata('jupyter_ai') || {};
          } catch {
            metadata = {};
          }
          const newMetadata = {
            ...metadata,
            editted: editted
          };
          // cell?.model.sharedModel.me
          cell?.model.setMetadata('jupyter_ai', newMetadata);
        }
        updateMetadata(false);
        const updateAIEditedField = function () {
          updateMetadata(true);
          sharedCell?.changed.disconnect(updateAIEditedField);
        };
        sharedCell?.changed.connect(updateAIEditedField);
      }
    });
  }
};

/**
 * Initialization data for the jupyterlab-magic-wand extension.
 */
const plugin: JupyterFrontEndPlugin<IAICellTracker> = {
  id: PLUGIN_ID + ':plugin',
  description: 'A cell tracker for the magic wand button.',
  autoStart: true,
  optional: [ISettingRegistry],
  requires: [INotebookTracker, IEventListener, ICellFooterTracker],
  provides: IAICellTracker,
  activate: async (
    app: JupyterFrontEnd,
    notebookTracker: INotebookTracker,
    eventListener: IEventListener,
    cellFooterTracker: ICellFooterTracker
  ) => {
    console.log(
      `Jupyter Magic Wand plugin extension activated: ${PLUGIN_ID}:tracker`
    );
    const aiCellTracker = new AICellTracker(
      app.commands,
      notebookTracker,
      eventListener,
      cellFooterTracker
    );
    return aiCellTracker;
  }
};

export default [plugin, agentCommands];
