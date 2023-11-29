import * as Types from "..";

 
export class AggregateRoot {
  /**
   * @type {Types.ICommand[]}
   */
  #events = [];

  /**
   * @type {boolean}
   */
  autoCommit = false;

  /**
   * @abstract
   * @param { Types.ICommand } event
   */
  publish(event) {}

  /**
   * @abstract
   * @param { Types.ICommand[] } events
   */
  publishAll(events) {}

  commit() {
    this.publishAll(this.#events);
    this.#events = [];
  }

  uncommit() {
    this.#events = [];
  }

  getUncommittedEvents() {
    return [...this.#events];
  }

  /**
   * @param { Types.ICommand[] } history - events
   */
  loadFromHistory(history) {
    history.forEach((event) => this.apply(event, true));
  }

  /**
   * @param { Types.ICommand } event
   * @param { boolean } isFromHistory
   */
  apply(event, isFromHistory = false) {
    if (!isFromHistory && !this.autoCommit) {
      this.#events.push(event);
    }
    this.autoCommit && this.publish(event);
    this.eventHandler(event);
  }

  /**
   * @abstract
   * @param { Types.ICommand } event
   */
  eventHandler(event) {
    throw new Error("must implements!");
  }
}
