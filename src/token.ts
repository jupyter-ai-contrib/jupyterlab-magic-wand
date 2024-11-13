import { Event } from '@jupyterlab/services';
import { Token } from '@lumino/coreutils';

export const IEventListener = new Token<IEventListener>('eventListener');

export interface IListener {
  (
    eventManager: Event.IManager,
    schemaId: string,
    data: Event.Emission
  ): Promise<void>;
}

export interface IEventListener {
  addListener(schemaId: string, listener: IListener): void;
}

export class EventListener implements IEventListener {
  constructor(eventManager: Event.IManager) {
    this._eventManager = eventManager;

    this._eventManager.stream.connect(
      async (manager: Event.IManager, event: Event.Emission) => {
        // Ignore an event if there is no listener.
        if (!(event.schema_id in this._listeners)) {
          return;
        }
        let listeners = this._listeners[event.schema_id];
        for (let listener of listeners) {
          await listener(manager, event.schema_id, event);
        }
      }
    );
  }

  /**
   * Add a listener to a named event.
   *
   * @param schemaId : the event schema ID to register callbacks.
   * @param listener : callback function to register
   * @returns
   */
  addListener(schemaId: string, listener: IListener): void {
    if (schemaId in this._listeners) {
      this._listeners[schemaId].add(listener);
      return;
    }
    // If this schemaId doesn't have any previous listeners, add one here.
    this._listeners[schemaId] = new Set([listener]);
  }

  removeListener(schemaId: string, listener: IListener): void {
    if (schemaId in this._listeners) {
      this._listeners[schemaId].delete(listener);
      return;
    }
  }

  private _listeners: { [schemaId: string]: Set<IListener> } = {};
  private _eventManager: Event.IManager;
}
