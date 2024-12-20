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

// import {
//   findCell,
// } from './utils';

// import { executeFeedbackCommand } from './feedback';
import { IEventListener } from 'jupyterlab-eventlistener';
import { ICellFooterTracker } from 'jupyterlab-cell-input-footer';

const PLUGIN_ID = 'jupyterlab_magic_wand';

// const agentCommands: JupyterFrontEndPlugin<void> = {
//   id: PLUGIN_ID + ":agentCommands",
//   description: 'A set of custom commands that AI agents can use.',
//   autoStart: true,
//   requires: [INotebookTracker],
//   activate: async (
//     app: JupyterFrontEnd,
//     notebookTracker: INotebookTracker,
//   ) => {
//     console.log(`Jupyter Magic Wand plugin extension activated: ${PLUGIN_ID}:agentCommands`);
//     app.commands.addCommand(
//       'insert-cell-below',
//       {
//         execute: (args) => {
//           let data = (args as any);
//           let cellId = data["cell_id"];
//           let newCellId = data["new_cell_id"] || undefined;
//           let cellType = data["cell_type"]
//           if (cellId) {
//             let { notebook } = findCell(cellId, notebookTracker);
//             let idx = notebook?.model?.sharedModel.cells.findIndex((cell) => {
//               return cell.getId() == cellId
//             })
//             if (idx !== undefined && idx >= 0) {
//               let newCell = notebook?.model?.sharedModel.insertCell(
//                 idx + 1, {
//                   cell_type: cellType,
//                   metadata: {},
//                   id: newCellId
//                 })
//               if (data["source"]) {
//                 // Add the source to the new cell;
//                 newCell?.setSource(data["source"]);
//                 // Post an update to ensure that notebook gets rerendered.
//                 notebook?.update();
//               }
//             }
//           }
//         }
//       }
//     )
//     app.commands.addCommand(
//       'update-cell-source',
//       {
//         execute: (args) => {
//           let data = (args as any);
//           let cellId = data["cell_id"];
//           if (cellId) {
//             let { notebook } = findCell(cellId, notebookTracker);
//             let cell = notebook?.model?.sharedModel.cells.find((cell) => {
//               return cell.getId() == cellId
//             })
//             if (cell) {
//               if (data["source"]) {
//                 // Add the source to the new cell;
//                 cell?.setSource(data["source"]);
//                 // Post an update to ensure that notebook gets rerendered.
//                 notebook?.update();
//                 notebook?.content.update();
//               }
//             }
//           }
//         }
//       }
//     )
//     app.commands.addCommand(
//       'track-if-editted',
//       {
//         execute: async (args) => {
//           let data = (args as any);
//           let cellId = data["cell_id"];
//           // don't do anything if no cell_id was given.
//           if (!cellId) {
//             return;
//           }

//           let { cell, notebook } = findCell(cellId, notebookTracker);
//           if (cell === undefined) {
//             return;
//           }
//           await cell.ready;

//           let sharedCell = notebook?.model?.sharedModel.cells.find((cell) => {
//             return cell.getId() == cellId
//           })
//           if (sharedCell === undefined) {
//             return;
//           }

//           function updateMetadata(editted: boolean = false) {
//             let metadata: object = {}
//             try {
//               metadata = cell?.model.getMetadata("jupyter_ai") || {}
//             } catch {
//               metadata = {}
//             }
//             let newMetadata = {
//               ...metadata,
//               editted: editted
//             }
//             // cell?.model.sharedModel.me
//             cell?.model.setMetadata("jupyter_ai", newMetadata);
//           }
//           updateMetadata(false);
//           let updateAIEditedField = function() {
//             updateMetadata(true);
//             sharedCell?.changed.disconnect(updateAIEditedField);
//           }
//           sharedCell?.changed.connect(updateAIEditedField);
//         }
//       }
//     )

//   }
// }

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
    cellFooterTracker: ICellFooterTracker,
    settingRegistry: ISettingRegistry | null
  ) => {
    console.log(
      `Jupyter Magic Wand plugin extension activated: ${PLUGIN_ID}:tracker`
    );
    await app.serviceManager.ready;
    const aiCellTracker = new AICellTracker(
      app.commands,
      notebookTracker,
      eventListener,
      cellFooterTracker
    );

    // Add a keyboard shortcut.
    // app.commands.addKeyBinding({
    //   command: aiCellTracker.commandId,
    //   args: {},
    //   keys: ['Shift Cmd L'],
    //   selector: '.jp-Notebook'
    // });

    // if (settingRegistry) {
    //   settingRegistry
    //     .load(plugin.id)
    //     .then(settings => {
    //       console.log('jupyterlab-magic-wand settings loaded:', settings.composite);
    //     })
    //     .catch(reason => {
    //       console.error('Failed to load settings for jupyterlab-magic-wand.', reason);
    //     });
    // }

    return aiCellTracker;
  }
};

// const feedback: JupyterFrontEndPlugin<void> = {
//   id: PLUGIN_ID + ":feedback",
//   description: 'A plugin to request feedback from the user.',
//   requires: [INotebookTracker, IAICellTracker],
//   autoStart: true,
//   activate: async (
//     app: JupyterFrontEnd,
//     notebookTracker: INotebookTracker,
//     aiCellTracker: IAICellTracker,
//     settingRegistry: ISettingRegistry | null,
//   ) => {
//     console.log(`Jupyter Magic Wand plugin extension activated: ${PLUGIN_ID}:feedback`);
//     await app.serviceManager.ready;

//     app.commands.addCommand(
//       'request-feedback',
//       {
//         execute: executeFeedbackCommand(notebookTracker)
//       }
//     )
//   }
// };

export default [plugin];
