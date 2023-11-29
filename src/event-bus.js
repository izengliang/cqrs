import { from, Subject, Subscription } from "rxjs";
import { filter, mergeMap } from "rxjs/operators";
import {AggregateRoot} from "./aggregate-root";
import * as Types from "./types.js";

/**
 * @public
 */
export class EventBus {
  /**
   * @type {Subscription[]}
   */
  #subscriptions = [];

  /**
   * @type { Subject<Types.ICommand> }
   */
  #subject = new Subject();

  /**
   * @type {Types.Domain}
   */
  #domain;

  /**
   * @param {  Types.Domain } domain
   */
  constructor(domain) {
    this.#domain = domain;
  }

  ngOnDestroy() {
    this.#subscriptions.forEach((subscription) => subscription.unsubscribe());
  }

  /**
   *
   * @param {Types.ICommand} event
   */
  publish(event) {
    this.#subject.next(event);
  }

  publishAll(events = []) {
    return events.map((event) => this.publish(event));
  }

  /**
   * regiester event's handler.
   * @param {string} type - event's type.
   * @param {Types.ICommandHandler} handler
   */
  register(type, handler) {
    const subscription = this.#subject
      .pipe(
        filter((event) => type === event.type),
        mergeMap((event) => from(Promise.resolve(handler(this.#domain, event))))
      )
      .subscribe({
        error: (error) => {
          throw error;
        },
      });
    this.#subscriptions.push(subscription);
    return this;
  }

  /**
   *
   * @param {Types.ISaga} saga
   */
  registerSaga(saga) {
    const stream$ = saga(this.#subject, this.#domain);

    const subscription = stream$
      .pipe(
        filter((e) => !!e),
        mergeMap((command) =>
          from(Promise.resolve(this.#domain.commandBus.execute(command)))
        )
      )
      .subscribe({
        error: (error) => {
          console.log(error);
        },
      });

    this.#subscriptions.push(subscription);
    return this;
  }

  /**
   * @param {typeof AggregateRoot} Class
   * @returns {typeof AggregateRoot}
   */
  mergeClassContext(Class) {
    const eventBus = this;

    return class extends Class {
      publish(event) {
        eventBus.publish(event);
      }

      publishAll(events) {
        eventBus.publishAll(events);
      }
    };
  }
}
