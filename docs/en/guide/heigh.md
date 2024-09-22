## Unified Unsubscription

Taking the `vue` framework as an example, if the stream is imported into a `vue` component from elsewhere and you want the subscription to be automatically canceled after the component is destroyed, you can use the `thenPlugin` of [plugin](/en/api/index#plugin) for unified handling:

```javascript
import { getCurrentScope, onScopeDispose } from 'vue'
import { Stream } from 'fluth'

const promise$ = new Stream()

promise$.plugin.then.push((unsubscribe) => {
  if (getCurrentScope()) onScopeDispose(unsubscribe)
})
```

Nodes subscribed in the `vue` single-file `setup` function will automatically unsubscribe when the `vue` component is destroyed, avoiding memory leaks.

## Unified Error Handling

Use the `executePlugin` of `plugin` to handle errors of nodes uniformly:

```javascript
import { Stream } from 'fluth'

const promise$ = new Stream()

promise$.plugin.execute.push((promise) =>
  promise.catch((err) => {
    console.error(err)
  }),
)
```

## Merging Streams

Merging streams refers to triggering the execution of nodes in another stream within one stream:
![image](/merge.drawio.png)
For merging that doesn't need to pass data, simply calling the [execute](/en/api/index#execute) of another stream node can achieve the merging purpose.


```typescript
import { Stream } from 'fluth'

const promise1$ = new Stream()
const subjection11$ = promise1$.then((data) => data + 1)
const subjection12$ = subjection11$.then((data) => data % 1)

const promise2$ = new Stream()
const subjection21$ = promise2$.then((data) => {
  subjection11$.execute()
  return data + 1
})
const subjection22$ = subjection21$.then((data) => data % 2)
```


If you need to pass data from multiple streams, you should look at operators like [combine](/en/api/operator/combine), [merge](/en/api/operator/merge), [concat](/en/api/operator/concat), etc., to perform stream merging.
