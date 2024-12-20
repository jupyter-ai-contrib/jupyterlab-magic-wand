import { DocumentWidget } from '@jupyterlab/docregistry';

import {
  Notebook,
  NotebookPanel,
  INotebookTracker
} from '@jupyterlab/notebook';

import { Cell, CodeCell } from '@jupyterlab/cells';

import { Widget } from '@lumino/widgets';

export function getNotebook(widget: Widget | null): Notebook | null {
  if (!(widget instanceof DocumentWidget)) {
    return null;
  }

  const { content } = widget;
  if (!(content instanceof Notebook)) {
    return null;
  }

  return content;
}

export function getActiveCell(widget: Widget | null): Cell | null {
  const notebook = getNotebook(widget);
  if (!notebook) {
    return null;
  }
  return notebook.activeCell;
}

export type CellData = {
  cell_id: string;
  type: string;
  source: string;
  error: string | null;
};

export type CellContext = {
  previous: CellData | null;
  current: CellData;
  next: CellData | null;
};

export function getCellData(cell: Cell): CellData {
  let source = cell?.model.sharedModel.getSource();
  cell?.model.selections;
  let error: null | string = null;
  if (cell?.model.type == 'code') {
    let codeCell = cell as CodeCell;
    let lastIndex = codeCell.outputArea.model.length - 1;
    let lastOutput = codeCell.outputArea.model.get(lastIndex);
    if (lastOutput && lastOutput.type == 'error') {
      let err = lastOutput.data['application/vnd.jupyter.error'] as any;
      if (err) {
        error = err['ename'] + ': ' + err['evalue'];
      }
    }
  }

  return {
    cell_id: cell?.model.sharedModel.getId(),
    type: cell?.model.type,
    error: error,
    source: source
  };
}

function cellFromIndex(notebook: Notebook, idx: number): Cell | undefined {
  let cellId = notebook.model?.cells.get(idx)?.id;
  if (cellId) {
    let cell = notebook._findCellById(cellId)?.cell;
    if (cell) {
      return cell;
    }
  }
}

export function getActiveCellContext(
  widget: Widget | null
): CellContext | null {
  const notebook = getNotebook(widget);
  if (!notebook) {
    return null;
  }

  const cellIdx = notebook.activeCellIndex;
  const current = notebook.activeCell;
  if (!current) {
    return null;
  }
  const currentData = getCellData(current);

  // Handle previous cell
  const previous = cellFromIndex(notebook, cellIdx - 1);
  let previousData = null;
  if (previous) {
    previousData = getCellData(previous);
  }
  const next = cellFromIndex(notebook, cellIdx + 1);
  let nextData = null;
  if (next) {
    nextData = getCellData(next);
  }

  return {
    previous: previousData,
    current: currentData,
    next: nextData
  };
}

type ActiveNotebookCell = {
  cell: Cell | undefined;
  notebook: NotebookPanel | undefined;
};

export function findCell(
  cellId: string,
  notebookTracker: INotebookTracker
): ActiveNotebookCell {
  // First, try the current notebook in focuse
  let currentNotebook = notebookTracker.currentWidget;
  let cell = notebookTracker.currentWidget?.content._findCellById(cellId)?.cell;
  if (currentNotebook && cell) {
    return {
      cell: cell,
      notebook: currentNotebook
    };
  }

  // Otherwise iterate through notebooks to find the cell.
  let notebookMatch = notebookTracker.find(notebook => {
    let cell = notebook.content._findCellById(cellId)?.cell;
    if (cell) {
      return true;
    }
    return false;
  });
  return {
    cell: cell,
    notebook: notebookMatch
  };
}
