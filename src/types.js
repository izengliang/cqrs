import { Observable, Subject } from "rxjs";

/**
 * @typedef ICommand
 * @prop {string} type
 *
 * @public
 * @callback ICommandHandler
 * @param { import("./domain.js").Domain } domain
 * @param { ICommand } command
 *
 * Saga function
 * @callback ISaga
 * @param { Subject<ICommand> } events$
 * @param { import("./domain.js").Domain } domain
 * @returns { Observable<ICommand> }
 */
