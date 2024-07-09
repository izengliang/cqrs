import { AbastractAggregateRoot } from "./abstract-aggregate-root.js";

var count = 0;

class AggregateRoot extends AbastractAggregateRoot {

    __data = { deleted: false };

    constructor(data = {}) {
        super()
        if (!data.id) {
            data.id = this.type + Date.now() + ++count;
        }
        this.__data = JSON.parse(JSON.stringify(data));
    }

    get _id() {
        return this.__data.id;
    }

    get json() {
        return JSON.parse(JSON.stringify({ ...this.__data, aggregateRootId: this.__data.id, aggregateName: this.type }));
    }

    see(key) {

        // let resolve, reject;
        // let promise = new Promise((_resolve, _reject) => {
        //     resolve = _resolve;
        //     reject = _reject;
        // });

        const value = key ? this.__data[key] : this.__data;

        if (value !== undefined) {
            return JSON.parse(JSON.stringify(value));

        }

        // return promise;
    }

    static parse(json) {
        return new this(json);
    }

    static _create(json) {
        return this.parse(json);
    }

    /**
     * 
     * @param {IEvent} event 
     */
    updater(event) {

        super.updater(event);
        if (event.name === "destory") {
            this.updateData(event, this.__data);
            this.onDestroyed();
            this.dispatchEvent(new Event("destroyed"));
        } else {
            let changed = false;
            const { proxy, revoke } = Proxy.revocable(this.__data, {
                get(t, p) {
                    changed = true;
                    return Reflect.get(t, p);
                }
            });
            this.updateData(event, proxy);

            if (changed) {
                this.dispatchEvent(new Event("changed"));
            }
            const firstChar = event.name.substring(0, 1);
            const otherChars = event.name.substring(1);
            const handlerFnName = "on" + firstChar.toUpperCase() + otherChars;
            if (this[handlerFnName]) {
                this[handlerFnName](event, proxy);
            }
            revoke();

        }

    }

    updateData(event, data) {
        if (event.name === "destroy") {
            data.destroyed = true;
        } else if (event.name === "undo") {
            const snap = event.details.snap;
            const events = event.details.events;
            for (let k in snap) {
                data[k] = snap[k];
            }
            events.forEach(event => this.updateData(event));
        }
    }

    /**
       * @param {IEvent} event 
       */
    async undo(event) {

        const snap = await this.$getSnapshot({ eventIndex: event.index })

        if (snap) {

            const events = this.$getEvents({
                startIndex: snap.endEventIndex + 1,
                eventIndex: event.index
            });

            /**
             * @todo how change data
             */

            this.apply("undo", { snap, events });
        }
    }


}


export { AggregateRoot };