
const convertSelector = (selector) => {
  if (typeof selector !== "string") {
    selector = (selector.aggregateName || "") + ":" + (selector.aggregateId || "") + ":" + (selector.event || "") + ":" + (selector.key || "")
  }
  return selector;
}

/**
 * @public
 */
export class EventBus {


  map = new Map();

  /**
   * @type { Subject<Types.ICommand> }
   */

  /**
   * @type {Types.Domain}
   */
  #domain;

  /**
   * @param {  Types.Domain } domain
   */
  constructor(domain) {
    this.#domain = domain;
  }

  destory() {
  }

  /**
   * 
   * @param { string | {aggregateName: string; aggregateId:string; event:string} } selector 
   * @param { ()=> void } handler 
   */
  on(selector, handler, rootId) {
    if (typeof selector === 'function') {
      handler = selector;
      selector = {};
    }
    selector = convertSelector(selector);
    if (!this.map.has(selector)) {
      this.map.set(selector, new Set())
    }
    const handlerSet = this.map.get(selector);
    if (rootId) {
      handlerSet.add([rootId, handler]);
    } else {
      handlerSet.add(handler);
    }
  }

  off(selector, handler) {
    if (typeof selector === 'function') {
      handler = selector;
      selector = {};
    }
    selector = convertSelector(selector);
    const handlerSet = this.map.get(selector);
    if (handlerSet) {
      handlerSet.delete(handler);
    }
  }

  /**
   * @param { IEvent } event 
   */
  trigger(event) {
    const selectorSet = new Set();
    if (event.key) {
      selectorSet.add((event.aggregateName || "") + ":" + (event.aggregateId || "") + ":" + (event.name || "") + ":" + (event.key || ""))
      selectorSet.add((event.aggregateName || "") + ":" + (event.aggregateId || "") + "::" + (event.key || ""))
      selectorSet.add((event.aggregateName || "") + "::" + (event.name || "") + ":" + (event.key || ""))
      selectorSet.add("::" + (event.name || "") + ":" + (event.key || ""))
      selectorSet.add((event.aggregateName || "") + "::" + ":" + (event.key || ""))
    }

    selectorSet.add((event.aggregateName || "") + ":" + (event.aggregateId || "") + ":" + (event.name || "")) + ":"
    selectorSet.add((event.aggregateName || "") + ":" + (event.aggregateId || "") + "::")
    selectorSet.add((event.aggregateName || "") + "::" + (event.name || "")) + ":"
    selectorSet.add("::" + (event.name || "")) + ":"
    selectorSet.add((event.aggregateName || "") + ":::")

    selectorSet.add(":::")

    for (let s of selectorSet) {
      this._trigger(s, event)
    }

  }

  async _trigger(selector, event) {
    const handlerSet = this.map.get(selector);
    if (handlerSet) {
      for (let handler of handlerSet) {
        if (Array.isArray(handler)) {
          const [id, fn] = handler;
          const root = await this.#domain.get(id);
          root && fn.apply(root, [event]);
        } else {
          handler(event);
        }
      }
    }
  }

}
