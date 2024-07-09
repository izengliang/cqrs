
class AbastractAggregateRoot extends EventTarget {

  /**
   * @type {Domain}
   */
  $domain;

  /**
   * @type {boolean}
   */
  static single = false;

  $on(selector, handler, hasKey) {
    selector = { ...selector };
    if (hasKey) {
      selector.key = this.id;
    }
    this.$domain.eventBus.on(selector, handler, this.id);
    return () => {
      this.$off(selector, handler, hasKey);
    }
  }

  $off(selector, handler, hasKey) {
    selector = { ...selector };
    if (hasKey) {
      selector.key = this.id;
    }
    this.$domain.eventBus.off(selector, handler);
  }

  /**
   * a.$listens([ s1, s2 ], (err)=>{});
   * a.$listens([ s1, s2 ], 2000);
   * 
   * const promise = a.$listens([ s1, s2 ], err=>{}, 2000);
   * 
   * promise.then(()=>{})
   * promise.catch((timeoutError)=>{})
   * 
   * promise.off(); 
   * 
   */
  $listens(selectors, callback, timeout) {

    if (typeof callback === "number") {
      timeout = callback;
      callback = null;
    } else {
      if (!timeout) {
        timeout = 200;
      }
    }


    const ct = setTimeout(() => {
      callback && callback(new Error("timeout!"));
      reject(new Error("timeout"));
    }, timeout);

    let resolve, reject;
    const offs = [];

    const promise = new Promise((_resolve, _reject) => { resolve = _resolve; reject = _reject });

    promise.off = () => {
      offs.forEach(off => off());
    }

    let count = 0;

    const counter = () => {
      count += 1;
      if (count === selectors.length) {

        clearTimeout(ct);
        resolve();
        callback && callback();
      }
    }

    for (let selector of selectors) {
      offs.push(this.$on(selector, counter, true));
    }

    return promise;

  }

  /**
   * @param { { startIndex:number } } config 
   */
  $getEvents(config) {
    this.$domain.$eventdb.getEvents(this.id, config);
  }

  /**
   * 
   * @param { { index?: number } } config
   */
  $getSnapshot(config) {
    this.$domain.$eventdb.getSnapshot(this.id, config);
  }

  async $get(type, id) {
    const self = this;
    const o = await this.$domain.get(type, id);
    const result = Object.create(o, {
      apply: {
        value: function (eventName, details) {
          return o.apply(eventName, details, self.id)
        }
      },
    });
    return result;
  }

  version = 0

  static get isAggregateRoot() {
    return true;
  }

  static get type() {
    return this.name;
  }

  get type() {
    return this.constructor.type;
  }

  /**
   * @return { AggregateRoot }
   */
  static parse(json) {
    throw new Error("must implements")
  }

  /**
   * @protected
   * @param {*} args 
   * @return {AggregateRoot}
   */
  static _create() {
    throw new Error("must implements");
  }

  /**
   * @type {IEvent}
   */
  _lastEvent;

  #queue = [];

  static get singleId() {
    return this.type + "__singleId";
  }

  get id() {
    return this.constructor.single ? this.constructor.singleId : this._id;
  }

  /**
   * get aggregate's data
   * must provide 'aggregateRootId' and 'aggregateName' attributes.
   */
  get json() {
    throw new Error("must implements");
  }

  /**
   * @param { string } eventName
   * @param { * } details
   * @param { string } key
   */
  apply(eventName, details, key) {
    /**
    * @type {IEvent}
    */
    const event = {
      name: eventName,
      aggregateName: this.constructor.type,
      aggregateId: this.id,
      details,
      key
    }

    let resolve;

    const done = new Promise(function (r) {
      resolve = r;
    });
    const unstored = { event, resolve }
    this.#queue.push(unstored);

    if (!this.#queue.started) {
      this._apply();
    }

    return done;
  }

  _apply() {
    this.#queue.started = true;
    const v = this.#queue.shift();

    const timestamp = new Date();

    v.event.id = this.constructor.type + ":" + this.id + ":" + v.event.name + timestamp.getTime();

    v.event.timestamp = timestamp;
    v.event.index = this._lastEvent ? this._lastEvent.index + 1 : 0;
    this.$domain.$eventdb.storeEvent(v.event).then(() => {


      this._lastEvent = v.event;

      this.updater(v.event);

      if (this.#queue.length) {
        this._apply();
      } else {

        this.#queue.started = false;
      }

      this.$domain.eventBus.trigger(v.event);
      v.resolve();

    }).catch(err => console.log(err))

  }

  /**
   * @abstract
   * @param { IEvent } event
   */
  updater(event) {
  }

  onCreated() {

  }

  onLoaded() {

  }

  destroy() {
    return this.apply("destroy");
  }

  onDestroyed() {

  }

}

export { AbastractAggregateRoot }