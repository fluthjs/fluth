## 统一取消订阅

以`vue`框架为例，如果流是从其他地方导入到`vue`组件的，想要组件销毁后订阅自动取消，可以使用[ plugin ](/cn/api/index#plugin)的`thenPlugin`统一处理：

```javascript
import { getCurrentScope, onScopeDispose } from 'vue'
import { Stream } from 'fluth'

const promise$ = new Stream()

promise$.plugin.then.push((unsubscribe) => {
  if (getCurrentScope()) onScopeDispose(unsubscribe)
})
```

在`vue`单文件`setup`函数中订阅的节点在`vue`组件销毁后自动取消订阅，避免内存泄漏。

## 统一错误处理

通过`plugin`的`executePlugin`统一对接点的错误进行处理:

```javascript
import { Stream } from 'fluth'

const promise$ = new Stream()

promise$.plugin.execute.push((promise) =>
  promise.catch((err) => {
    console.error(err)
  }),
)
```

## 合流

合流指的是在一条流中触发另一条流节点的运行：
![image](/merge.drawio.png)
对于不需要传递数据的合流，只需要调用另一个流节点的[ execute ](/cn/api/index#execute)就可以达到合流目的

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

如果要传递多条流的数据，需要看看操作符[ combine ](/cn/api/operator/combine)、[ merge ](/cn/api/operator/merge)、[ concat ](/cn/api/operator/concat)等来进行合流。
