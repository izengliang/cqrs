
let count = 0;

class MemoryEventDB {

    constructor(domain, { autoClean = false, triggerCleanSnapMaxCount = 5 } = {}) {
        this.$domain = domain;
        this.config = { autoClean, triggerCleanSnapMaxCount };
    }

    events = [];
    snaps = [];

    /**
     * @param {string} rootId 
     */
    async getSnapCount(rootId) {
        return this.snaps.filter(snap => snap.aggregateId === rootId).length;
    }

    /**
     * 
     * @param {IEvent} event 
     */
    async storeEvent(event) {

        this.events.push(event);

        if (event.name === "create") {

            this.snaps.push({
                id: "id" + ++count,
                endEventIndex: event.index,
                index: 0,
                aggregateId: event.aggregateId,
                aggregateName: event.aggregateName,
                json: event.details.json
            });

        } else {

            const snap = await this.getSnapshot(event.aggregateId);

            if ((snap && event.index - snap.endEventIndex > 5) || event.index > 5) {
                const root = await this.$domain.get(event.aggregateName, event.aggregateId);
                const json = await root.json;

                this.snaps.push({
                    id: "id" + ++count,
                    endEventIndex: event.index,
                    index: snap ? snap.index + 1 : 0,
                    aggregateId: event.aggregateId,
                    aggregateName: event.aggregateName,
                    json
                });

            }

            if (this.config.autoClean) {
                const count = await this.getSnapCount(event.aggregateId);
                if (this.config.triggerCleanSnapMaxCount < count) {

                    //remove snaps
                    const allSnap = this.snaps.filter(s => s.aggregateId === event.aggregateId && s.id !== snap.id);
                    allSnap.forEach(s => {
                        this.snaps.splice(this.snaps.findIndex(s2 => s2 === s), 1)
                    });

                    const lastSnap = allSnap.at(-1);

                    // remove events
                    const allEvents = this.events.filter(e => e.aggregateId === event.aggregateId && e.index <= lastSnap.endEventIndex)

                    allEvents.forEach(e => {
                        this.events.splice(this.events.findIndex(e2 => e2 === e), 1)
                    })
                }
            }

        }
    }

    async getEvents(rootId, { startIndex = 0, endIndex } = {}) {
        const result = [];
        for (let e of this.events) {
            if (e.aggregateId === rootId && e.index >= startIndex && (typeof endIndex === "number" ? e.index <= endIndex : true)) {
                result.push(e);
            }
        }
        result.sort((a, b) => a.index - b.index)
        return result;
    }

    /**
     * 
     * 删除 event 和之前的 snapshot , 并且建立一个新的 snapshot
     * 
     * @param {IEvent} event 
     */
    async remove(event) {
        const snap = await this.getSnapshot(event.aggregateId, { eventIndex: event.index })
        const events = await this.getEvents(event.aggregateId, { eventIndex: event.index });
        const Type = this.$domain.AggregateRootMap.get(event.aggregateName);
        const instance = Type.parse(snap.json);

        events.forEach(event => {
            instance.updater(event);
        });

        const json = instance.json;
        const newSnap = {
            id: "id" + ++count,
            endEventIndex: event.index,
            index: snap ? snap.index + 1 : 0,
            aggregateId: event.aggregateId,
            aggregateName: event.aggregateName,
            json
        };

        this.snaps.push(newSnap);

        //remove snaps
        const allSnap = this.snaps.filter(s => s.aggregateId === event.aggregateId && s.id !== newSnap.id);
        allSnap.forEach(s => {
            this.snaps.splice(this.snaps.findIndex(s2 => s2 === s), 1)
        });

        const lastSnap = allSnap.at(-1);

        // remove events
        const allEvents = this.events.filter(e => e.aggregateId === event.aggregateId && e.index <= newSnap.endEventIndex)

        allEvents.forEach(e => {
            this.events.splice(this.events.findIndex(e2 => e2 === e), 1)
        })

    }

    async getSnapshot(rootId, config = {}) {
        const { index, endEventIndex, eventIndex } = config;
        return this.snaps.findLast(s => {
            let bool = true;
            if (typeof index === 'number') {
                bool = s.index === index;
            } else if (bool && typeof endEventIndex === 'number') {
                bool = s.endEventIndex === endEventIndex;
            } else if (bool && typeof eventIndex === "number") {
                bool = s.endEventIndex <= eventIndex;
            }
            return s.aggregateId === rootId && bool;
        });
    }

}

export { MemoryEventDB }