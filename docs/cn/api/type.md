```typescript
type OnFulfilled<T> = Parameters<Promise<T>['then']>[0]
type OnRejected<T> = Parameters<Promise<T>['catch']>[0]
type OnFinally<T> = Parameters<Promise<T>['finally']>[0]

type Subjection = Pick<
  Observer,
  | 'then'
  | 'thenOnce'
  | 'catch'
  | 'finally'
  | 'unsubscribe'
  | 'setUnsubscribeCallback'
  | 'execute'
> & { finish: PromiseWithResolvers<any>['promise'] }

/**
 * then plugin, this plugin can be used to unsubscribe cur observer
 * @param unsubscribe
 */

type thenPlugin = (unsubscribe: () => void) => void
/** execute plugin, this plugin can be used to reset cur observer promise or unsubscribe cur observer
 * @param promise observer promise
 * @param unsubscribe unsubscribe observer
 * @returns return promise will reset observer promise
 */
type executePlugin = (
  promise: Promise<any>,
  unsubscribe: () => void,
) => Promise<any>
```
