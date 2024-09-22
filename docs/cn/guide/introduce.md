# 简介

## 基本概念

`fluth`是一个基于`promise`的流式编程库。

假如认为`promise`是发布者而`then`方法是订阅者，

`promise`的发布行为则只有一次，`fluth`加强了`promise`，让`promise`可以不断的发布！

```javascript
import { Stream } from 'fluth'

const promise$ = new Stream()

promise$.then(
  (r) => console.log('resolve', r),
  (e) => console.log('reject', e),
)

promise$.next(1)
promise$.next(Promise.reject(2))
promise$.next(3)

// Logs:
// resolve 1
// reject 2
// resolve 3
```

相比其他流式编程库，fluth更注重异步场景的流程处理，通过`fluth`可以轻松用流的方式组织异步逻辑，代码的语义和时序将更加清晰。

## 适用场景

`fluth`的初衷是为了解决响应式异步编程问题。

在响应式编程中异步操作经常会修改响应式数据，业务代码会采用监听数据的变化来处理异步逻辑；但是采用监听数据变化的方式来组织代码会带来两个问题：1、阅读困难，2、时序混乱。

监听数据是没有语义的，并且丢掉了上下文导致代码阅读困难，哪怕简单的业务代码维护成本也越来越高；复杂业务的异步流程时序也是非常复杂，监听数据变化的方式让控制时序变得困难。

`promise`其实可以很好的解决这两个问题，每一步的处理都放在`then`中处理意味着有一条线将所有的逻辑串联起来，任何节点都可以语义化命名，阅读代码整理逻辑将变得非常容易；由于每一条逻辑都是由上而下，串行处理带来的另一个收益就是时序管理简单。

但是`promise`只能执行一次，而且无法中途停止。`fluth`则解决了`promise`的这些问题，可以将`fluth`看成`promise`流，能够不断地发布数据，中间的任何一个`then`节点都可以订阅上游数据，也可以取消订阅。

采用`fluth`之后，原来网状的响应式逻辑变成了可追踪的流式逻辑：

![image](/structure.drawio.png)

## 对比rxjs

[rxjs](https://rxjs.dev/)是当前主流的流式编程库，和`fluth`相比而言有两个明显的区别：

1. `fluth`上手非常简单，只要会使用`promise`就可以使用
2. `rxjs`在数据的处理上有更加强大的能力，`fluth`则更关注观察者的编排：
   - `rxjs`拥有丰富的`operator`来实现强大的数据处理能力，但是`observer`之间是并发的
   - `fluth`基于`promise`，更擅长用于`observer`的编排

```javascript
// rxjs:
stream$.pipe(operator1).pipe(operator2).pipe(operator3)
stream$.subscribe(observer1)
stream$.subscribe(observer2)
stream$.subscribe(observer3)
```

```javascript
//fluth:
stream$.then(observer1).then(observer2).then(observer3)
stream$.next(1)
```
