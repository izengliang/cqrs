import { map } from "rxjs";
import { Domain, AggregateRoot } from "../src/index.js";

class ItemRepository {
  /**@type {Domain}*/
  domain;
  constructor(domain) {
    this.domain = domain;
  }

  #itemMap = new Map();

  all() {
    return [...this.#itemMap.values()];
  }
  get(id) {
    return this.#itemMap.get(id);
  }
  remove(id) {
    this.#itemMap.delete(id);
  }
  num = 0;
  create() {
    ++this.num;
    const ItemClass = this.domain.getAggegateClass(Item);
    const item = new ItemClass("id" + this.num);
    this.#itemMap.set(item.id, item);
    const event = {
      type: "create item",
    };
    this.domain.eventBus.publish(event);
    return item;
  }
}

class MyDomain extends Domain {
  itemRepository = new ItemRepository(this);
}

// const  { name: string, type: "change item name" };

// { type: "create item" };

// {type: "done"}

class Item extends AggregateRoot {
  /**
   *
   * @param {string} id
   */
  constructor(id) {
    super();
  }

  #name = "";
  get name() {
    return this.#name;
  }

  changeName(name) {
    const changeNameEvent = {
      type: "change item name",
      name: "lion",
    };
    this.apply(changeNameEvent);
  }
  /**
   *
   * @param { ICommand } event
   */
  eventHandler(event) {
    switch (event.type) {
      case "change item name":
        const e = event;
        this.#name = e.name;
    }
  }
}

const domain = new MyDomain([Item]);

domain.eventBus.register(
  "change item name",
  /**
   *
   * @param {MyDomain} domain
   */
  (domain, event) => {
    console.log("event.....", event);
  }
);

domain.eventBus.registerSaga(($, d) => {
  return $.pipe(
    map((event) => {
      return {
        type: "done",
      };
    })
  );
});

domain.commandBus
  .register("change item name", (domain, { id, name }) => {
    console.log("calll  change comamnnn....");
    const item = domain.itemRepository.get(id);
    item?.changeName(name);
    item?.commit();
  })
  .register("done", (d, c) => {
    console.log("done !!!");
  });

const item = domain.itemRepository.create();


domain.execute({
  type: "change item name",
  name: "hello",
  id: item.id,
});
