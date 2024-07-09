import { Domain, AggregateRoot, MemoryEventDB } from "../../src/index.js";

var idcount = 0;

class Note extends AggregateRoot {
    static _create({
        content = "",
        tags = []
    } = {}) {

        const date = new Date();
        return super._create({
            id: "id" + ++idcount,
            tags,
            time: date,
            createTime: date,
            updateTime: date,
            content,
            contentType: "plain",
        })
    }
    /**
     * 
     * @param {  { tags?:string[] ; content?:string; contentType?: string  } } config 
     */
    change(config = {}) {
        this.apply("change", config);
    }

    onChange(event, data) {
        for (let k in event.details) {
            data[k] = event.details[k];
        }
    }
}

class Todo extends AggregateRoot {
    static _create({
        content = "",
        tags = [], done = false,
        startTime,
        endTime,
        isAllday,
        repetition
    }) {
        const date = new Date();
        return super._create({
            id: "id" + ++idcount,
            tags,
            time: date,
            createTime: date,
            updateTime: date,
            content,
            contentType: "plain",
            isTodo: true,
            done,
            startTime: startTime || date, //TODO
            endTime: endTime || date,
            isAllday: isAllday || false,
            repetition: repetition || null,
        })

    }

    async complete() {
        await this.apply("complete");
        this.$domain.create();
    }

    onComplete(event, data) {
        data.done = true;
    }

    discomplete() {
        this.apply("discomplete")
    }

    onDiscomplete(event, data) {
        data.done = false;
    }

    change(config = {}) {
        // startTime, endTime, isAllday, repetition = false;
        this.apply("change", config)
    }

    onChange(event, data) {
        for (let k in event.details) {
            data[k] = event.details[k];
        }
    }
}


const domain = new Domain(new MemoryEventDB(), []);

export { Note, Todo };