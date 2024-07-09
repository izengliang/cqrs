const { Domain } = require("./domain");

class QueryResult extends EventTarget {

    /**
     * 
     * @param {IEvent} event 
     */
    async handler(event) {
        const isPart = await this.querier.$isPart(event.aggregateId, this.selector);
        if (isPart) {
            if (!this.map.has(event.aggregateId)) {
                const o = await this.querier.domain.get(event.aggregateId);
                o && this.map.set(event.aggregateId, o);
            }
            this.dispatchEvent(event);
        }
    }

    map = new Map();

    constructor({ selector, items, querier }) {
        this.items = items;
        this.selector = selector;
        this.querier = querier;
        this.handler = this.handler.bind(this);

        for (let item of items) {
            this.map.set(item.id, item);
        }
    }

    destory() {
        this.map = null;
        this._off();
    }

}



class Querier {

    /**
     * 
     * @param {Domain} domain 
     */
    constructor(domain) {
        this.$domain = domain;
    }

    /**
     * @return { Promise<string[]> }  
     */
    async _findIds(selector) {

    }

    /**
     * 
     * @param { string | any } idOrObj 
     */
    async $isPart(idOrObj, selector) {
        // find db
        // 手工写 
    }

    async find(selector) {
        const ids = await this._findIds(selector);
        const items = [];
        for (let id of ids) {
            const obj = await this.$domain.get(id);
            if (obj) {
                items.push(obj);
            }
        }

        const queryResult = new QueryResult({ items, selector, querier: this });
        const off = this.$domain.eventBus.on({}, queryResult.handler);
        queryResult._off = off;
        return queryResult;
    }

}

/**
 * 
 * @param {Domain} domain 
 */
const queryPlugin = (domain) => {
    const querier = new Querier(domain);
    domain.find = (selector) => querier.find(selector);
}

export { queryPlugin };