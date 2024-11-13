import { INotebookTracker } from '@jupyterlab/notebook';
import { IDiffEntry } from 'nbdime/lib/diff/diffentries';
import { createPatchStringDiffModel } from 'nbdime/lib/diff/model';
import { MergeView } from 'nbdime/lib/common/mergeview';
import {
  ToolbarButton,
} from '@jupyterlab/ui-components';
import { 
  findCell,
  findMagicCellToolbar
} from './utils';

export type MergeViewArgs = {
  cell_id: string,
  original_source: string,
  diff: IDiffEntry[]
}

/**
 * Adds a diff to the Magic Toolbar
 * 
 * @param notebookTracker 
 * @param args 
 */
export function executeDiffCommand(notebookTracker: INotebookTracker) {
  return (args: any) => {

    let data: MergeViewArgs = (args as any);
    let cellId = data["cell_id"];
    if (cellId) {
      let { cell } = findCell(cellId, notebookTracker);
      if (data && data["original_source"] && data["diff"] && cell) {
        
        let diff = createPatchStringDiffModel(
          data["original_source"],
          data["diff"]
        )
        
        let mergeView: MergeView;
        mergeView = new MergeView({ remote: diff });
        mergeView.addClass("nbdime-root");
        mergeView.addClass("jp-Notebook-diff");
        mergeView.hide();

        // Add magic button to the toolbar
        let toolbarWidget = findMagicCellToolbar(cell);
        toolbarWidget?.addWidget(mergeView);
        let toolbar = toolbarWidget?.toolbar;

        if (toolbarWidget?.isHidden) {
          toolbarWidget.show();
          toolbarWidget.update();
        }   
        toolbar?.insertAfter(
          'icon',
          'compare',
          new ToolbarButton({
            // icon: wandIcon,
            label: "Compare changes",
            enabled: true,
            onClick: () => { 
              if (mergeView.isHidden) {
                mergeView.show()
                return;
              }
              mergeView.hide()
            }
          })
        )
      }
    }
  }
}
  