import { CommandRegistry } from '@lumino/commands';
import { ReadonlyPartialJSONObject } from '@lumino/coreutils';
import { Signal, ISignal } from '@lumino/signaling';
import { VirtualElement } from '@lumino/virtualdom';

import { INotebookTracker } from '@jupyterlab/notebook';

import { spinnerIcon } from './icon';
import {
  getCurrentActiveCell,
  getCurrentActiveCellId,
  getActiveCellContext,
  findCell
} from './utils';
import { LabIcon } from '@jupyterlab/ui-components';

type CommandFunc<T> = (args: ReadonlyPartialJSONObject) => T;

export namespace PendingCellCommand {
  export interface IPendingCellCommand extends CommandRegistry.ICommandOptions {
    completed: ISignal<this, any>;
  }

  export interface IOptions {
    /**
     * The commmand function to execute.
     */
    id: string;
    label: string;
    icon: LabIcon;
    execute: CommandFunc<any | Promise<any>>;
    complete: CommandFunc<any | Promise<any>>;
    timeout?: number;
    pendingLabel?: string;
    pendingIcon?: LabIcon;
    /**
     * Should the cell be editable while the button is pending?
     */
    editable?: boolean;
    /**
     * Complete the pending task.
     */
    timedOut?: CommandFunc<any | Promise<any>>;
    error: CommandFunc<any | Promise<any>>;
  }
}

export class PendingCellCommand
  implements PendingCellCommand.IPendingCellCommand
{
  // A Mapping of cell ID to a timeout handle.
  _pendingCells = new Map<string, NodeJS.Timeout>();
  _notebookTracker: INotebookTracker;
  _commandRegistry: CommandRegistry;
  _options: PendingCellCommand.IOptions;

  constructor(
    notebookTracker: INotebookTracker,
    commandRegistry: CommandRegistry,
    options: PendingCellCommand.IOptions
  ) {
    this._notebookTracker = notebookTracker;
    this._commandRegistry = commandRegistry;
    this._options = options;
    this._commandRegistry.addCommand(this._options.id, {
      execute: args => this.execute(args),
      icon: args => this.icon(args),
      label: () => this.label(),
      isEnabled: () => this.isEnabled()
    });
  }

  /**
   * Text used as a tooltip for the Magic AI button.
   *
   * @returns
   */
  label(): string {
    const cellId = getCurrentActiveCellId(this._notebookTracker);
    if (cellId && cellId in this._pendingCells) {
      return this._options.pendingLabel ?? '';
    }
    return this._options.label;
  }

  /**
   * Returns a magic Wand icon if the current cell has no
   * pending requests. Otherwise returns a pending icon.
   *
   * @param args
   * @returns LabIcon
   */
  icon(args: any): VirtualElement.IRenderer | undefined {
    console.log(this);
    const cellId = getCurrentActiveCellId(this._notebookTracker);
    console.log(cellId);
    if (cellId && this._pendingCells.get(cellId)) {
      console.log('seen?');
      return this._options.pendingIcon ?? spinnerIcon;
    }
    return this._options.icon;
  }

  /**
   * Should the button be enabled? If a pending request is out
   * standing, this will be `false` and disable the button.
   *
   * @returns `true` if no pending request is outstanding.
   */
  isEnabled(): boolean {
    const cellId = getCurrentActiveCellId(this._notebookTracker);
    if (cellId && this._pendingCells.get(cellId)) {
      return false;
    }
    return true;
  }

  /**
   * Take the current cell and commit it's source
   *
   * @returns
   */
  async execute(args: any) {
    const currentNotebook = this._notebookTracker.currentWidget;
    const cellContext = getActiveCellContext(currentNotebook);
    const cell = getCurrentActiveCell(this._notebookTracker);

    // Should the cell be editable while in a pending state?
    // Defaults to false;
    cell?.model.setMetadata('editable', this._options.editable ?? false);
    cell?.saveEditableState();

    if (!cellContext) {
      return;
    }

    const cellId = cellContext.current.cell_id;

    if (this._options.timeout) {
      const timeoutId = setTimeout(() => {
        this._pendingCells.delete(cellId);
        this._commandRegistry.notifyCommandChanged(this._options.id);
        // Call the user defined timeout method if given.
        if (this._options.timedOut) {
          this._options.timedOut({});
        }
        // Re-enable the cell.
        cell?.model.setMetadata('editable', true);
        cell?.saveEditableState();
      }, this._options.timeout);
      this._pendingCells.set(cellId, timeoutId);
    }
    // Execute the command function for this pending button.
    this._options.execute(args);
    this._commandRegistry.notifyCommandChanged(this._options.id);
  }

  async complete(cellId: string, args: any) {
    const pending = this._pendingCells.get(cellId);
    if (pending) {
      clearTimeout(pending);
    }
    const { cell } = findCell(cellId, this._notebookTracker);
    cell?.model.setMetadata('editable', true);
    cell?.saveEditableState();
    // Remove pending item from cell map
    this._pendingCells.delete(cellId);
    this._commandRegistry.notifyCommandChanged(this._options.id);
    // Call the complete method passed
    this._options.complete(args);
    // Pass the same args to the completed method.
    this._completed.emit(args);
  }

  // Signal when the complete method is called.
  private _completed = new Signal<this, any>(this);

  /**
   * A signal that emits when a new beat has happened.
   */
  get completed(): ISignal<this, any> {
    return this._completed;
  }
}
