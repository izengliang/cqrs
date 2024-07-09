
/**
 * @typedef IEvent
 * @prop { string } id
 * @prop { string } name
 * @prop { number } timestamp
 * @prop { string } [aggregateName]
 * @prop { string } [aggregateId]
 * @prop { number } [index]
 * @prop { string } [key]
 * @prop { * } [details]
 * 
 * 
 * @typedef ISnapshot
 * @prop { string } id
 * @prop { string } endEventIndex
 * @prop { number } index
 * @prop { string } aggregateRootId
 * @prop { string } aggregateName
 * @prop { any } json
 */
