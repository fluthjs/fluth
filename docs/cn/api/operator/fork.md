# fork

从输入的[ stream ](/cn/api/index#stream)或者[ subjection ](/cn/api/index#subjection)中分流一条新的流

- 类型

  ```typescript
  type fork = (arg$: Stream | Subjection) => Stream
  ```

- 详情

  - 流的分流操作，返回一个新的流
  - 输入的流取消订阅后，新的流也会取消订阅
  - 输入的流[ 结束 ](/cn/guide/base#结束)后，新的流也会结束

::: warning 为什么不直接订阅
相比直接调用订阅节点的`then`，采用`fork`中间会多一层`then`可以立即触发`thenPlugin`的执行，在某些场景下可以做到定义和使用进行分离
:::
