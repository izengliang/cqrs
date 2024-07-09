## CQRS API

## Aggregate Root

### Aggregate Root 描述

*   聚合根是逻辑最小单元
*   聚合根对象具有唯一性(包括分布式系统)
*   常驻于内存中. 内部数据可为空, 需要时填充, 保证最小内存使用率.
*   订阅功能
*   具有回溯功能
*   支持 Saga 模式方法

### Aggregate Root API

#### 生命周期

##### onCreated

当创建新的聚合根后, 会调用自身的 onCreated 方法.  
该方法通常用来创建其他相关聚合根对象. (todo)

```js
class MyAggregate extends AggregateRoot{
    onCreated(){
      const a =  await this.$domain.create("AggreateA");
      const b = await this.$domain.create("AggreateB");
    }
}
```

##### onLoaded

当创建新的聚合根, 或加载已存在的聚合根后, 会调用onLoaded .  
该方法通常用于监听领域事件 , 或当机恢复等.

```js
class MyAggregate extends AggregateRoot{
    onLoaded(){
       this._off = this.$on({aggregateName: "todo", event:"done"} , this.todoDoneHandler);
    }

    todoDoneHandler(todoDoneEvent){
        ...
    }
}
```

##### onDestory

当销毁该聚合根后,会调用该方法. 用于销毁监听器.

```js
class MyAggregate extends AggregateRoot{

    onLoaded(){
       this._off = this.$on({aggregateName: "todo", event:"done"} , this.todoDoneHandler);
    }

    onDestory(){
        this._off();
    }

}
```

#### 创建

`_create` 静态方法用于具体创建 , `AggregateRoot`已实现了此方法, 也可自定义.

```plaintext
class MyAggregate extends AggregateRoot{

    static _create(args){
        // validate args
        ...
        return new this(args);
    }

}
```

通过 `domain.create(type,args)` 创建一个实例.

```plaintext
const obj = await domain.create("MyAggregate", {name:"leo"});
```

销毁

销毁后会调用 onDestory 生命周期方法.

```plaintext

const todo001 = await domain.get("Todo", "id001");
await todo001.delete(); 
```

事件回溯

调用 `undo(event)` 可实现以event为终点事件的回溯.  
回溯后,会产生一个 `undo` 事件.

```plaintext

// event0 , event1, event2 , event4, event5.

const todo = await domain.get("todo","id001");
await todo.undo(event2);
```

领域方法

外部通过调用聚合根的领域方法, 产生领域事件, 领域事件更新自身数据,并发布到事件总线. 其他聚合根可监听事件.

```plaintext
class Todo extends AggregateRoot{
    done(){
        this.apply("done");
    }

    onDone(event,data){
        data.done = true;
    }

    changeContent(content){
        // validate content ...
        this.apply("change", {content});
    }

    onChange(event,data){
        data.content = data.details.content;
    }

}
```

可以用过 `on` 加 `event` 的方法, 来更改自身数据, 也可以通过 `updateData(event, data)` 实现.

```plaintext
class Todo extends AggregateRoot{
    done(){
        this.apply("done");
    }

    changeContent(content){
        // validate content ...
        this.apply("change", {content});
    }

    updateData(event, data){
        switch(event.name){
            case "done":
                data.done = true;
            break;

            case "change":
                data.content = event.details.content;
            break;
        }
    }

}
```

Saga 方法模式

通过 `$listens` 方法可以一次性监听多个领域方法, 从而实现 Saga .

```plaintext

class Saga extends AggregateRoot{

    async sagaFn(){

        const o1 =  await this.$domain.get("01"); 
        o1.fn() // async emit event1

        const o2 =  await this.$domain.get("02"); 
        o2.fn() // async emit event2

        const o3 =  await this.$domain.get("03"); 
        o3.fn() // async emit event3

        await this.$listens([event1, event2, event3]);

        this.apply("done");
    }

}
```

通过 `onLoaded` 实现当机恢复

```plaintext
class Saga extends AggregateRoot{

    onStart(event,data){
        data.started = true;
    }

    onDone(event,data){
        data.done = true;
    }

    onLoaded(){
       const started = this.see("started");
       const done = this.see("done");
       if(started &amp;&amp; !done){
         this.restore();
       }
    }

    restore(){
        ...
    }

    async sagaFn(){

        this.apply("start");

        const o1 =  await this.$domain.get("01"); 
        o1.fn() // async emit event1

        const o2 =  await this.$domain.get("02"); 
        o2.fn() // async emit event2

        const o3 =  await this.$domain.get("03"); 
        o3.fn() // async emit event3

        await this.$listens([event1, event2, event3]);

        this.apply("done");

    }

}
```

## Domain

## 事件总线 event bus

## 查询

## 集群

## 代理 Aggregate / Domain