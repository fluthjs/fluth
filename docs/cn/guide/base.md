# 基础概念

## 流

在`fluth`中一共有两种流，分别是[ Stream ](/cn/api/index#stream)流和[ Subjection ](/cn/api/index#subjection)流，所谓的流就是一个可以订阅的数据源。

```typescript
import { Stream } from 'fluth'

const promise$ = new Stream()

const subjection$ = promise$.then(xxx)
```

## 结束

只有[ Stream ](/cn/api/index#stream)流才可以结束，结束意味着流不在推送新的数据。

```typescript
import { Stream } from 'fluth'

const promise$ = new Stream()

promise$.next(1, true) // true表示结束，最后一次推流
```

每个订阅节点在执行完最后这次数据推送后都会触发[finish](/cn/api/index#finish)这个`promise`，然后自动取消订阅。

## 订阅节点

`fluth`采用`promise`的形式进行数据流的推送，通过[then](/cn/api/index#then)、[thenOnce](/cn/api/index#thenonce)方法对流新增一个订阅节点，返回订阅节点的`Subjection`实例，整体使用和`promise`保持一致。

## 链式订阅

调用订阅节点的[subjection](/cn/api/index#subjection)的`then`进行链式订阅

## 取消订阅

调用订阅节点的[subjection](/cn/api/index#subjection)的`unsubscribe`取消订阅

## 主动执行

调用订阅节点的[subjection](/cn/api/index#subjection)的`execute`方法重新执行上一次订阅的数据流
