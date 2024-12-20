// import {
//   PanelLayout,
//   Panel,
//   Widget
// } from '@lumino/widgets';
// import { MergeView } from 'nbdime/lib/common/mergeview';
// import {
//   ToolbarButton,
//   closeIcon,
//   Toolbar
// } from '@jupyterlab/ui-components';
// import { Cell } from '@jupyterlab/cells';
// import { wandIcon } from '../icon';

// export const MAGIC_TOOLBAR_ID = "jp-ai-MagicToolbarWidget";

// /**
//  * A UI Component that renders a code diff
//  * underneath a cell.
//  */
// export class MagicToolbarWidget extends Panel {

//   toolbar: Toolbar | undefined;
//   mergeView: MergeView | undefined;

//   constructor(
//     // diff: StringDiffModel,
//     cell: Cell
//   ) {
//     super();

//     let layout = (cell?.layout as PanelLayout)

//     // Dispose any old widgets attached to this cell.
//     let oldWidget = layout.widgets.find((w) => w.id == MAGIC_TOOLBAR_ID);

//     if (oldWidget) {
//       oldWidget.dispose();
//     }

//     this.id = MAGIC_TOOLBAR_ID;
//     this.addClass(MAGIC_TOOLBAR_ID);

//     // Appends the diff element after
//     // the node in the DOM with this class.
//     // NOTE: is there a better way to do this?
//     let predecessorClass = "jp-Cell-inputWrapper"
//     let predecessorIndex = layout.widgets.findIndex((widget: Widget, index: number, obj: readonly Widget[]) => {
//       return widget.hasClass(predecessorClass);
//     })

//     if (predecessorIndex == -1) {
//       console.error("Could not find the correct element.");
//       return;
//     }

//     // Insert Widget right after
//     layout.insertWidget(predecessorIndex + 1, this);
//     this.toolbar = new Toolbar();
//     this.toolbar.addClass("jp-ai-MagicFooterToolbar");

//     let iconWidget = new Widget({node: wandIcon.element()});
//     iconWidget.addClass('jp-Toolbar-Icon');

//     this.toolbar.addItem
//       'icon',
//       iconWidget
//     )

//     this.toolbar.addItem('spacer', Toolbar.createSpacerItem())
//     let that = this;
//     this.toolbar.addItem(
//       'clear',
//       new ToolbarButton({
//         icon: closeIcon,
//         enabled: true,
//         onClick: () => {
//           that.dispose();
//         }
//       })
//     )

//     this.addWidget(this.toolbar);
//   }

//   addItemOnLeft(name: string, tem: Widget) {

//   }

//   addItemOnRight(name: string, item: Widget) {

//   }
// }
