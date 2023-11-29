import { CommandBus } from "./command-bus.js";
import { EventBus } from "./event-bus.js";
import { AggregateRoot } from "./aggregate-root.js";
import * as Types from "./types.js";

/**
 * @public
 */
export class Domain {
  /**
   * @readonly
   */
  commandBus = new CommandBus(this);

  /**
   * @readonly
   */
  queryBus = new CommandBus(this);

  /**
   * @readonly
   */
  eventBus = new EventBus(this);

  /**
   * @param { typeof AggregateRoot } Bases
   */
  constructor(Bases) {
    this.registerAggregateClass(Bases);
  }

  /**
   * @param {  Types.ICommand } command
   */
  execute(command) {
    return this.commandBus.execute(command);
  }

  /**
   * @param { Types.ICommand } query
   */
  query(query) {
    return this.queryBus.execute(query);
  }

  /**
   * @type {Map<typeof Types.AggregateRoot, typeof Types.AggregateRoot>}
   */
  #AggregateClassMap = new Map();

  /**
   * @param {(typeof AggregateRoot | (typeof AggregateRoot)[] )} Base
   */
  registerAggregateClass(Base) {
    /**
     * @private
     * @type {(typeof Types.AggregateRoot)[]}
     */
    let Bases = [];
    if (!Array.isArray(Base)) {
      Bases.push(Base);
    } else {
      Bases = Base;
    }
    Bases.forEach((Base) => {
      const Class = this.eventBus.mergeClassContext(Base);
      this.#AggregateClassMap.set(Base, Class);
    });
  }

  /**
   * @param {typeof Types.AggregateRoot} key
   * @returns {typeof Types.AggregateRoot | undefined }
   */
  getAggegateClass(key) {
    return this.#AggregateClassMap.get(key);
  }
}
