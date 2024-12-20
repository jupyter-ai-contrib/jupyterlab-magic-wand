// import { ICellFooterTracker } from 'jupyterlab-cell-input-footer';

// import {
//   ToolbarButton,
// } from '@jupyterlab/ui-components';
// import {
//   findCell,
//   findMagicCellToolbar
// } from './utils';
// import { requestFeedback } from './components/feedback';
// import { feedbackIcon, thumbDownIcon, thumbUpIcon } from './icon';
// import { Widget } from '@lumino/widgets';
// import { Notification } from '@jupyterlab/apputils';
// import { requestAPI } from './handler';
// /**
//  * Adds a diff to the Magic Toolbar
//  *
//  * @param notebookTracker
//  * @param args
//  */
// export function executeFeedbackCommand(cellFooterTracker: ICellFooterTracker) {
//   return (args: any) => {

//     let data = (args as any);
//     let cellId = data["cell_id"];
//     if (cellId) {
//       let { cell } = findCell(cellId, notebookTracker);
//       if (cell === undefined) {
//         return;
//       }

//       cellFooterTracker.showFooter(cellId);
//       // if (toolbarWidget?.isHidden) {
//       //   toolbarWidget.show();
//       //   toolbarWidget.update();
//       // }
//       let toolbar = toolbarWidget?.toolbar;
//       if (toolbar === undefined){
//         return;
//       }

//       let metadata: any = cell.model.getMetadata("jupyter_ai");

//       let feedbackButton = new ToolbarButton({
//         icon: feedbackIcon,
//         enabled: true,
//         onClick: () => {

//           requestFeedback().then( async (result) => {
//             if (!result.button.accept) {
//               return;
//             }
//             await requestAPI('/api/ai/feedback', {
//               method: 'POST',
//               body: JSON.stringify({
//                 agent: metadata["agent"] || [],
//                 helpful: null,
//                 messages: metadata["messages"] || [],
//                 input: result.value
//               })
//             })
//             Notification.success("Feedback sent. Thank you!", { autoClose: 2000})

//           })
//         }
//       })

//       toolbar.insertAfter(
//         'spacer',
//         'feedback',
//         feedbackButton
//       )

//       toolbar.insertAfter(
//         'spacer',
//         'not-helpful',
//         new ToolbarButton({
//           icon: thumbDownIcon,
//           enabled: true,
//           onClick: async () => {
//             await requestAPI('/api/ai/feedback', {
//               method: 'POST',
//               body: JSON.stringify({
//                 agent: metadata["agent"] || [],
//                 helpful: false,
//                 messages: metadata["messages"] || [],
//                 input: null
//               })
//             })
//             Notification.success("Feedback sent. Thank you!", { autoClose: 2000})
//           }
//         })
//       )

//       toolbar.insertAfter(
//         'spacer',
//         'helpful',
//         new ToolbarButton({
//           icon: thumbUpIcon,
//           enabled: true,
//           onClick: async () => {
//             await requestAPI('/api/ai/feedback', {
//               method: 'POST',
//               body: JSON.stringify({
//                 agent: metadata["agent"] || [],
//                 helpful: true,
//                 messages: metadata["messages"] || [],
//                 input: null
//               })
//             })
//             Notification.success("Feedback sent. Thank you!", { autoClose: 2000})
//           }
//         })
//       )
//       let textWidget = new Widget();
//       textWidget.node.innerText = "Was this helpful?";
//       textWidget.addClass("jp-cell-footer-toolbar-text");

//       toolbar.insertAfter(
//         'spacer',
//         'blank',
//         textWidget
//       )

//     }
//   }
// }
