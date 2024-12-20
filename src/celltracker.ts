import { Token } from '@lumino/coreutils';
import { VirtualElement } from '@lumino/virtualdom';
import { wandIcon, spinnerIcon } from './icon';
import { CommandRegistry } from '@lumino/commands';
import { INotebookTracker } from '@jupyterlab/notebook';
import { IEventListener } from 'jupyterlab-eventlistener';
import { Event } from '@jupyterlab/services';
import { Signal, ISignal } from '@lumino/signaling';
import { Cell } from '@jupyterlab/cells';
import { getActiveCellContext } from './utils';
import { requestAPI } from './handler';
import { Notification } from '@jupyterlab/apputils';
import { timeoutDialog, errorDialog } from './components/errordialog';
import { NotebookPanel } from '@jupyterlab/notebook';
import { ICellFooterTracker } from 'jupyterlab-cell-input-footer';

export const IAICellTracker = new Token<IAICellTracker>('AICellTracker');

export type responseHandledData = {
  cell: Cell | undefined;
  response: AIWorkflowState | null;
};

export interface IAICellTracker {
  responseHappened: ISignal<this, responseHandledData>;
}

export type ERROR_EVENT = {
  type: string;
  id: string;
  time: string;
  reply_to: string;
  error_type: string;
  message: string;
};

export type LabCommand = {
  name: string;
  args: any;
};

export type AIWorkflowState = {
  agent: string;
  input: string;
  context: any;
  messages?: Array<string>;
  commands: Array<LabCommand>;
};

type ActiveNotebookCell = {
  cell: Cell | undefined;
  notebook: NotebookPanel | undefined;
};

const AI_EVENT_SCHEMA_ID =
  'https://events.jupyter.org/jupyter_ai/magic_button/v1';
const AI_ERROR_EVENT_SCHEMA_ID =
  'https://events.jupyter.org/jupyter_ai/error/v1';

const AI_COMMAND_ID = 'jupyterlab_magic_wand:improve-cell';
const AI_QUERY_TIMEOUT = 1800000; // in milliseconds

/**
 * Registers and maintains a dynamic command and cell toolbar item
 * for making "magic" requests to a Jupyter AI model.
 */
export class AICellTracker implements IAICellTracker {
  commandId = AI_COMMAND_ID;
  eventSchemaId = AI_EVENT_SCHEMA_ID;
  pendingCells = new Map<string, NodeJS.Timeout>(); //{ [cellId: string ]: NodeJS.Timeout } = {};

  _notebookTracker: INotebookTracker;
  _eventListener: IEventListener;
  _commandRegistry: CommandRegistry;
  _cellFooterTracker: ICellFooterTracker;

  constructor(
    commandRegistry: CommandRegistry,
    notebookTracker: INotebookTracker,
    eventListener: IEventListener,
    cellFooterTracker: ICellFooterTracker
  ) {
    this._notebookTracker = notebookTracker;
    this._eventListener = eventListener;
    this._commandRegistry = commandRegistry;
    this._cellFooterTracker = cellFooterTracker;

    // Add the response handler to the event system
    // which routes messages to the relevant cell.
    this._eventListener.addListener(
      this.eventSchemaId,
      async (manager, schemaId, event: Event.Emission) => {
        await this.response(event);
      }
    );

    this._eventListener.addListener(
      AI_ERROR_EVENT_SCHEMA_ID,
      async (manager, schemaId, event: Event.Emission) => {
        const data = event as any as ERROR_EVENT;
        this.pendingCells.delete(data.reply_to);
        this._commandRegistry.notifyCommandChanged(this.commandId);

        const { cell } = this.findCell(data.reply_to);
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

    // Register the command in JupyterLab.
    this._commandRegistry.addCommand(this.commandId, {
      label: args => this.label(),
      icon: args => {
        console.log('seen?');
        return this.icon(args);
      },
      execute: args => this.execute(),
      isEnabled: args => this.isEnabled()
    });
    // Update anytime a response happens.
    this.responseHappened.connect(() => {
      this._commandRegistry.notifyCommandChanged(this.commandId);
    });
  }

  /**
   * Handles Magic AI events on the event stream,
   * and routes the response to the proper cell.
   *
   * @param event
   */
  async response(event: Event.Emission) {
    const data = event as any as AIWorkflowState;

    const cellId = data.context['cell_id'];

    if (cellId) {
      const pending = this.pendingCells.get(cellId);
      if (pending) {
        clearTimeout(pending);
      }
      const { cell } = this.findCell(cellId);
      cell?.model.setMetadata('editable', true);
      cell?.saveEditableState();
      // Remove pending item from cell map
      this.pendingCells.delete(cellId);
      const metadata = cell?.model.getMetadata('jupyter_ai');
      const newMetadata = {
        ...metadata,
        agent: data.agent,
        messages: data.messages
      };
      cell?.model.setMetadata('jupyter_ai', newMetadata);
      if (cell) {
        this._cellFooterTracker.showFooter(cellId);
      }
      this._responseHappened.emit({ cell: cell, response: data });
    }

    if (data.commands) {
      data.commands.forEach(async (command: LabCommand) => {
        try {
          await this._commandRegistry.execute(command.name, command.args);
        } catch (err) {
          console.log('Could not execute AI command: ' + command.name);
          console.error(err);
        }
      });
    }
  }

  // A signal anytime an AI response event happens.
  private _responseHappened = new Signal<this, responseHandledData>(this);

  /**
   * A signal that emits when a new beat has happened.
   */
  get responseHappened(): ISignal<this, responseHandledData> {
    return this._responseHappened;
  }

  /**
   * Text used as a tooltip for the Magic AI button.
   *
   * @returns
   */
  label(): string {
    console.log('SEEN label??');

    const cellId = this.getCurrentActiveCellId();
    if (cellId && cellId in this.pendingCells) {
      return 'AI is thinking...';
    }
    return 'AI, please help!';
  }

  /**
   * Returns a magic Wand icon if the current cell has no
   * pending requests. Otherwise returns a pending icon.
   *
   * @param args
   * @returns LabIcon
   */
  icon(args: any): VirtualElement.IRenderer | undefined {
    console.log('SEEN icon??');
    const cellId = this.getCurrentActiveCellId();
    if (cellId && this.pendingCells.get(cellId)) {
      return spinnerIcon;
    }
    return wandIcon;
  }

  /**
   * Should the button be enabled? If a pending request is out
   * standing, this will be `false` and disable the button.
   *
   * @returns `true` if no pending request is outstanding.
   */
  isEnabled(): boolean {
    console.log('SEEN enabled??');

    const cellId = this.getCurrentActiveCellId();
    if (cellId && this.pendingCells.get(cellId)) {
      return false;
    }
    return true;
  }

  /**
   * Simple method to get the active cell.
   *
   * @returns
   */
  getCurrentActiveCell(): Cell | null | undefined {
    console.log(this._notebookTracker.currentWidget?.content.activeCell);

    return this._notebookTracker.currentWidget?.content.activeCell;
  }

  /**
   * Get the current active cell's ID.
   *
   * @returns
   */
  getCurrentActiveCellId(): string | null | undefined {
    console.log('getCurrentActiveCellId');

    const notebook = this._notebookTracker.currentWidget;
    const idx = notebook?.content.activeCellIndex;
    if (idx !== undefined && notebook) {
      return notebook.model?.cells.get(idx)?.id;
    }
  }

  /**
   * Find a cell based on it's unique ID.
   *
   * This will start by searching the currently
   * active notebook. If the ID is not present there,
   * we will iterate through all notebooks until
   * we find the cell. If the cell is never found,
   * return undefined.
   *
   * @param cellId
   * @returns
   */
  findCell(cellId: string): ActiveNotebookCell {
    // First, try the current notebook in focuse
    const currentNotebook = this._notebookTracker.currentWidget;
    const cell =
      this._notebookTracker.currentWidget?.content._findCellById(cellId)?.cell;
    if (currentNotebook && cell) {
      return {
        cell: cell,
        notebook: currentNotebook
      };
    }
    // Otherwise iterate through notebooks to find the cell.
    const notebookMatch = this._notebookTracker.find(notebook => {
      const cell = notebook.content._findCellById(cellId)?.cell;
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

  /**
   * Take the current cell and commit it's source
   *
   * @returns
   */
  async execute() {
    const currentNotebook = this._notebookTracker.currentWidget;
    const cellContext = getActiveCellContext(currentNotebook);
    const cell = this.getCurrentActiveCell();

    // Temporarily block the cell from being edited.
    cell?.model.setMetadata('editable', false);
    cell?.saveEditableState();

    if (!cellContext) {
      console.log('AI Command not focused on a cell.');
      return;
    }

    const cellId = cellContext.current.cell_id;

    const timeoutId = setTimeout(() => {
      console.log('AI request timed out.');
      this.pendingCells.delete(cellId);
      this._commandRegistry.notifyCommandChanged(this.commandId);

      // Raise a notification to the user
      Notification.warning('The AI Magic button timed out.', {
        autoClose: 5000,
        actions: [
          {
            label: 'Read more',
            callback: () => {
              timeoutDialog(cellContext?.current.source);
            }
          }
        ]
      });

      // Re-enable the cell.
      cell?.model.setMetadata('editable', true);
      cell?.saveEditableState();
    }, AI_QUERY_TIMEOUT);

    this.pendingCells.set(cellId, timeoutId);

    const codeInput = cell?.model?.sharedModel.getSource();

    // Make the request.
    requestAPI('/api/ai/magic', {
      method: 'POST',
      body: JSON.stringify({
        input: codeInput,
        context: {
          cell_id: cellId,
          content: currentNotebook?.content.model?.toJSON()
        },
        commands: []
      })
    });

    this._commandRegistry.notifyCommandChanged(this.commandId);
  }
}
