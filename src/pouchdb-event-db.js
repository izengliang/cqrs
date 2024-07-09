import PouchDB from "pouchdb-browser";
import { v4 } from uuid;

class PouchEventDB {

    /**
     * 
     * @param {*} domain 
     * @param { {eventdb: PouchDB, snapdb:PouchDB} } param1 
     */
    constructor(domain, { autoClean = false, triggerCleanSnapMaxCount = 5, eventdb, snapdb } = {}) {
        if (!(eventdb && snapdb)) {
            throw new Error("please provider eventdb & snapdb pouchDB instance.");
        }
        this.$domain = domain;
        this.config = { autoClean, triggerCleanSnapMaxCount };
        this.$eventdb = eventdb;
        this.$snapdb = snapdb;
    }

    async getEvents(aggregateId, { startIndex = 0, endIndex } = {}) {

        const selector = {
            aggregateId,
            index: { $gte: startIndex }
        };

        if (typeof endIndex === "number") {
            selector.index.$lte = endIndex
        }

        const result = this.$eventdb.find({
            selector
        })

        return result.docs;
    }

    /**
     * @param {IEvent} event 
     */
    async storeEvent(event) {
        if (event.name === "create") {
            try {
                const response = await this.$eventdb.put(event);
            } catch (err) {
                console.log(err);
            }
        } else {

            const snap = await this.getSnapshot(event.aggregateId);

            if ((snap && event.index - snap.endEventIndex > 5) || event.index > 5) {
                const root = await this.$domain.get(event.aggregateName, event.aggregateId);
                const json = await root.json;
                try {
                    const response = await this.$snapdb.put({
                        id: v4(),
                        endEventIndex: event.index,
                        index: snap ? snap.index + 1 : 0,
                        aggregateId: event.aggregateId,
                        aggregateName: event.aggregateName,
                        json
                    });
                } catch (err) {
                    console.log(err);
                }
            }

            if (this.config.autoClean) {

                const result = this.$snapdb.find({
                    selector: {
                        aggregateRootId: event.aggregateId
                    },
                    sort: ["index"]
                });

                const snaps = result.docs;

                if (this.config.triggerCleanSnapMaxCount < snaps.length) {

                    //remove snaps
                    try {
                        const willDelSnaps = snaps.slice(0, snaps.length - 1);
                        willDelSnaps.forEach(s => s._deleted = true)
                        const result = await this.$snapdb.bulkDocs(willDelSnaps);
                    } catch (err) {
                        console.log(err);
                    }

                    // remove events
                    const result = this.$eventdb.find({
                        selector: {
                            aggregateId: event.aggregateId,
                            index: {
                                $lte: snaps.at(-1).index
                            }
                        }
                    });

                    const willDelEvents = result.docs;

                    willDelEvents.forEach(e => {
                        e._deleted = true;
                    });

                    try {
                        const result = await this.$eventdb.bulkDocs(willDelEvents);
                    } catch (err) {
                        console.log(err);
                    }

                }
            }
        }
    }

    /**
     * @param {string} aggregateRootId 
     */
    async getSnapshot(aggregateRootId) {
        const result = await this.$db.find({
            selector: {
                aggregateRootId
            },
            sort: ['index'],
            limit: 1
        });

        const docs = results.docs;
        return docs[0];
    }

    /**
     * 
     * 删除 event 和之前的 snapshot , 并且建立一个新的 snapshot
     * 
     * @param {IEvent} event 
     */
    async remove(event) {

        const snap = await this.getSnapshot(event.aggregateName, { eventIndex: event.index })
        const events = await this.getEvents(event.aggregateId, { eventIndex: event.index });
        const Type = this.$domain.AggregateRootMap.get(event.aggregateName);
        const instance = Type.parse(snap.json);
        events.forEach(event => {
            instance.updater(event);
        })
        const json = instance.json;

        const newSnap = {
            id: v4(),
            endEventIndex: event.index,
            index: snap ? snap.index + 1 : 0,
            aggregateId: event.aggregateId,
            aggregateName: event.aggregateName,
            json
        };

        await this.$snapdb.put(newSnap);

        // delete snaps
        const willDelSnaps = (await this.$snapdb.find({
            selector: {
                aggregateRootId: event.aggregateId,
                index: { $lte: snap.index }
            }
        })).docs;

        willDelSnaps.forEach(s => s._deleted = true);

        await this.$snapdb.bulkDocs(willDelSnaps);


        // delete events
        events.forEach(e => e._deleted = true);

        await this.$eventdb.bulkDocs(events);

    }


}

export { PouchEventDB };