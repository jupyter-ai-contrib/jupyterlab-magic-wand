import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { Widget } from '@lumino/widgets';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { INotebookTracker } from '@jupyterlab/notebook';
import { Event } from '@jupyterlab/services';
import { errorDialog } from './components/errordialog';
import { Notification } from '@jupyterlab/apputils';
import { getCurrentActiveCell, getActiveCellContext, findCell } from './utils';
import { requestAPI } from './handler';
import { IEventListener } from 'jupyterlab-eventlistener';
import { ICellFooterTracker } from 'jupyterlab-cell-input-footer';
import { PendingCellCommand } from './pendingCellCommand';
import { wandIcon } from './icon';
import { IMagicProvider } from './provider';

const PLUGIN_ID = 'jupyterlab_magic_wand';
const AI_EVENT_SCHEMA_ID =
  'https://events.jupyter.org/jupyter-ai/agents/Magic+Button+Agent/state';
const AI_ERROR_EVENT_SCHEMA_ID =
  'https://events.jupyter.org/jupyter_ai/error/v1';

export type LabCommand = {
  name: string;
  args: any;
};

export type Context = {
  cell_id: string;
  content: any;
};

export type AIWorkflowState = {
  agent: string;
  input: string;
  context: Context;
  messages?: Array<string>;
  commands: Array<LabCommand>;
};

export type ERROR_EVENT = {
  type: string;
  id: string;
  time: string;
  state: AIWorkflowState;
  error_type: string;
  message: string;
};

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
 * A plugin providing the default magic provider.
 *
 * By default, call the /api/ai/magic endpoint provided by the jupyterlab-magic-wand
 * server extension.
 */
const magicProviderPlugin: JupyterFrontEndPlugin<IMagicProvider> = {
  id: PLUGIN_ID + ':magic-provider',
  autoStart: true,
  provides: IMagicProvider,
  activate: async app => {
    return {
      magic: async ({
        codeInput,
        content,
        cellId
      }: IMagicProvider.IMagicContext) => {
        // Make the request.
        requestAPI('/api/ai/magic', {
          method: 'POST',
          body: JSON.stringify({
            request: {
              input: codeInput,
              context: {
                cell_id: cellId,
                content
              },
              commands: []
            }
          })
        });
      }
    };
  }
};

/**
 * Initialization data for the jupyterlab-magic-wand extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID + ':button',
  description: 'A cell tracker for the magic wand button.',
  autoStart: true,
  requires: [
    INotebookTracker,
    IEventListener,
    ICellFooterTracker,
    IMagicProvider
  ],
  optional: [ISettingRegistry],
  activate: async (
    app: JupyterFrontEnd,
    notebookTracker: INotebookTracker,
    eventListener: IEventListener,
    cellFooterTracker: ICellFooterTracker,
    magicProvider: IMagicProvider
  ) => {
    console.log(
      `Jupyter Magic Wand plugin extension activated: ${PLUGIN_ID}:button`
    );
    await app.serviceManager.ready;

    const command = new PendingCellCommand(notebookTracker, app.commands, {
      id: 'jupyterlab_magic_wand:execute',
      label: 'AI, please help!',
      pendingLabel: 'AI is thinking...',
      icon: wandIcon,
      timeout: 10000,
      execute: async () => {
        const currentNotebook = notebookTracker.currentWidget;
        const cellContext = getActiveCellContext(currentNotebook);
        const cell = getCurrentActiveCell(notebookTracker);

        if (!cellContext) {
          console.log('AI Command not focused on a cell.');
          return;
        }

        const cellId = cellContext.current.cell_id;
        const codeInput = cell?.model?.sharedModel.getSource() ?? '';
        const content = currentNotebook?.content.model?.toJSON();
        await magicProvider.magic({
          cellId,
          codeInput,
          content
        });
      },
      complete: args => {
        const data = args as AIWorkflowState;

        const cellId = data.context['cell_id'];

        if (cellId) {
          const { cell } = findCell(cellId, notebookTracker);
          cell?.model.setMetadata('editable', true);
          cell?.saveEditableState();
          // Remove pending item from cell map
          const metadata = cell?.model.getMetadata('jupyter_ai');
          const newMetadata = {
            ...metadata,
            agent: data.agent,
            messages: data.messages
          };
          cell?.model.setMetadata('jupyter_ai', newMetadata);
          if (cell) {
            const footer = cellFooterTracker.getFooter(cellId);
            // Add a magic icon to the cell toolbar.
            // (remove old ones too).
            footer?.removeToolbarItem('magicIcon');
            const iconWidget = new Widget({ node: wandIcon.element() });
            iconWidget.addClass('jp-Toolbar-Icon');
            footer?.addToolbarItemOnLeft('magicIcon', iconWidget);
            cellFooterTracker.showFooter(cellId);
          }
        }

        if (data.commands) {
          data.commands.forEach(async (command: LabCommand) => {
            try {
              await app.commands.execute(command.name, command.args);
            } catch (err) {
              console.log('Could not execute AI command: ' + command.name);
              console.error(err);
            }
          });
        }
      },
      error: () => {}
    });

    eventListener.addListener(
      AI_EVENT_SCHEMA_ID,
      async (manager, schemaId, event: Event.Emission) => {
        const args = event as any as AIWorkflowState;
        await command.complete(args.context.cell_id, args);
      }
    );

    eventListener.addListener(
      AI_ERROR_EVENT_SCHEMA_ID,
      async (manager, schemaId, event: Event.Emission) => {
        const data = event as any as ERROR_EVENT;

        const { cell } = findCell(data.state.context.cell_id, notebookTracker);
        cell?.model.setMetadata('editable', true);
        cell?.saveEditableState();

        // Raise a notification to the user
        Notification.error('An error occurred with the AI Magic button.', {
          autoClose: 5000,
          actions: [
            {
              label: 'Read more',
              callback: () => {
                errorDialog(data.error_type, data.message);
              }
            }
          ]
        });
      }
    );
  }
};

export default [plugin, agentCommands, magicProviderPlugin];

export * from './provider';
