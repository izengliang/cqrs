import * as Types from "..";

/**
 * @public
 */
export class CommandBus {
  /**
   * @type {Object.<string, Types.ICommandHandler>}
   */
  #handlers = {};

  /**
   * @type {Types.Domain}
   */
  #domain;

  /**
   * @param { Types.Domain } domain
   */
  constructor(domain) {
    this.#domain = domain;
  }

  /**
   * execute command
   * @param {Types.ICommand} command
   */
  execute(command) {
    const handler = this.#handlers[command.type];
    if (handler) {
      return handler(this.#domain, command);
    }
  }

  /**
   * register command handler.
   * @param { string } type
   * @param { Types.ICommandHandler } handler
   * @returns {this}
   */
  register(type, handler) {
    this.#handlers[type] = handler;
    return this;
  }
}
