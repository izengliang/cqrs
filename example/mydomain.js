import { Domain, AggregateRoot, MemoryEventDB } from "../src/index.js";


// single mode
class TodoManager extends AggregateRoot {

    handler(event) {
        console.log("handler...", event);
    }

    onLoaded() {
        this.$domain.eventBus.on({ aggregateName: "Todo" }, this.handler, this.id);
    }

    async exchange(id1, id2) {
        this.$on({ aggregateName: "Todo", aggregateId: id1 }, e => console.log(e), true);
        this.$on({ aggregateName: "Todo", aggregateId: id2 }, e => console.log(e), true);
        const t1 = await this.$get("Todo", id1);
        const t2 = await this.$get("Todo", id2);
        const t1content = t1.json.content;
        const t2content = t2.json.content;
        await t1.change(t2content);
        await t2.change(t1content);
    }

}

class Todo extends AggregateRoot {

    change(content) {
        this.apply("change", { content });
    }

    onChange(event, data) {
        data.content = event.details.content;
    }
}


const domain = new Domain(new MemoryEventDB(), [Todo, TodoManager]
)
const tm1 = await domain.create("TodoManager", { id: "tmid01" });

domain.eventBus.on({ aggregateName: "Todo" }, function (event) {
    // console.log(event);
})
const t1 = await domain.create("Todo", { id: "id001", content: "todo 01", done: true })
const t2 = await domain.create("Todo", { id: "id002", content: "todo 0122222", done: true })

// console.log(t1.json.content)
// console.log(t2.json.content)


await tm1.exchange(t1.id, t2.id);

// console.log(t1.json.content)
// console.log(t2.json.content)