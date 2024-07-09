import { AggregateRoot, Domain } from "../src/index.js";
import { assert } from "chai";

class User extends AggregateRoot {

    onCreated() {
        this.created = true;
    }

    onLoaded() {
        this.loaded = true;
    } 

    constructor(data = {}) {
        data.money = 0;
        super(data)
    }

    saveMoney(money) {
        this.apply("saveMoney", { money });
    }

    withdrawMoney(money) {
        this.apply("withdrawMoney", { money });
    }

    onSaveMoney(event, data) {
        data.money += event.details.money;
    }

    onWithdrawMoney(event, data) {
        data.money -= event.details.money;
    }

}

class Bank extends AggregateRoot {

    constructor() {
        super({ userIds: [], transfers: [] });
    }

    onLoaded() {
        this.$on({ aggregateName: "User", name: "created" }, this.userCreatedHandler)
    }

    userCreatedHandler(event) {
        const userId = event.details.id;
        this.apply("addUser", { userId });
    }

    onAddUser(event, data) {
        const userId = event.details.userId;
        data.userIds.push(userId);
    }

    onTransferComplete(event, data) {

        data.transfers.push(event.details)
    }

    async transfer(fromUserId, toUserId, money, done) {

        let promise, resolve, reject;
        promise = new Promise((_resolve, _reject) => {
            resolve = _resolve;
            reject = _reject;
        })

        this.$listens([
            { aggregateName: "User", aggregateId: fromUserId, event: "withdrawMoney" },
            { aggregateName: "User", aggregateId: toUserId, event: "saveMoney" },
        ]).then(async () => {
            await this.apply("transferComplete", { fromUserId, toUserId, money });
            done && done();
            resolve();
        }).catch(err => {
            done && done(err);
            reject(err);
        });

        const fromUser = await this.$get("User", fromUserId);
        const toUser = await this.$get("User", toUserId);

        fromUser.withdrawMoney(money);
        toUser.saveMoney(money);

        return promise;
    }
}

describe('AggregateRoot', function () {

    let domain, bank;

    before(async function () {
        domain = new Domain([User, Bank]);
        bank = await domain.create("Bank");
    });

    it('life cycle', async function () {

        const user = await domain.create("User");
        assert.isOk(user.created);
        assert.isOk(user.loaded);

        let destroyed = user.see("destroyed");
        assert.isOk(!destroyed);

        await user.destroy();
        destroyed = user.see("destroyed");
        assert.isOk(destroyed);

    });

    it("bank.transfer", async function () {
        const fromUser = await domain.create("User");
        const toUser = await domain.create("User");
        assert.isOk(bank.see("transfers").length === 0)
        await bank.transfer(fromUser.id, toUser.id, 90);
        assert.isOk(bank.see("transfers").length === 1)
    });

});
