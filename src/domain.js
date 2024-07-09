import { EventBus } from "./event-bus.js";
import { AbastractAggregateRoot as AggregateRoot } from "./abstract-aggregate-root.js";
import { MemoryEventDB } from "./memory-event-db.js";

class Domain {

  constructor(eventdb, AggregateRoots) {
    if (Array.isArray(eventdb)) {
      AggregateRoots = eventdb;
      eventdb = new MemoryEventDB(this);
    }
    this.$eventdb = eventdb;
    AggregateRoots?.forEach(o => this.register(o));
  }

  /**
   * 
   * @param {(domain)=>{}} plugin 
   */
  use(plugin) {
    if (typeof plugin !== "function") throw new TypeError('plugin must be a function!')
    plugin(this);
    return this;
  }

  /**
   * @type {Map<string, typeof AggregateRoot>}
   */
  AggregateRootMap = new Map();

  register(o) {
    if (o.isAggregateRoot) {
      this.AggregateRootMap.set(o.type, o);
    }
  }

  eventBus = new EventBus(this);


  /**
   * @type {Map<string, resolve[]>}
   */
  queue = new Map();

  /**
   * @type {Map<string, AggregateRoot[]>}
   */
  cache = new Map();

  /**
   * @type { ( type:string, aggregateRootId:string )=> Promise<AggregateRoot> } 
   */
  async get(type, aggregateRootId) {

    if (arguments.length === 1) {
      aggregateRootId = type;
    }

    let obj = this.cache.get(aggregateRootId);

    if (obj) {
      return Promise.resolve(obj);
    }

    let resolve;

    const promise = new Promise(r => resolve = r);

    if (!this.queue.has(aggregateRootId)) {
      this.queue.set(aggregateRootId, []);

      const snap = await this.$eventdb.getSnapshot(aggregateRootId);
      /**@todo */
      const events = await this.$eventdb.getEvents(aggregateRootId, { startIndex: snap.endEventId });
      /**@type {AggregateRoot} */

      const AggregateRootClass = this.AggregateRootMap.get(type)
      const instance = AggregateRootClass.parse(snap.aggregateRootData);
      events.forEach(e => instance.update(e));
      instance.onLoaded();
      this.cache.set(aggregateRootId, instance);
      const resolves = this.queue.get(aggregateRootId);
      resolves.forEach(resolve => resolve(instance));
    }

    const arr = this.queue.get(aggregateRootId);

    arr.push(resolve);

    return promise;
  }

  async create(type, details) {
    const C = this.AggregateRootMap.get(type);

    if (C.single) {
      let instance = await this.get(C.singleId);
      if (instance) {
        return instance;
      }
    }

    const instance = C._create(details);

    if (this.cache.has(instance.id)) {
      return instance;
    }
    
    instance.$domain = this;

    await instance.apply("create", { type: C.type, id: instance.id, json: instance.json })
    await instance.onCreated();
    instance.onLoaded();
    this.cache.set(instance.id, instance);
    return instance;
  }

}

export { Domain };