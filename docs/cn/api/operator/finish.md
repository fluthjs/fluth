# finish

将输入的[ stream ](/cn/api/index#stream)或者[ subjection ](/cn/api/index#subjection)结束后的数据进行组合，返回一个新的流

![image](/finish.drawio.svg)

- 类型

  ```typescript
  type combine: (...args: (Stream | Subjection)[]) => Stream;
  ```

- 详情

  - 所有输入的流都[ 结束 ](/cn/guide/base#结束)后，新的流才会发出第一个数据
  - 新的流发出第一个数据后也会结束
  - 所有输入的流取消订阅后，新的流也会取消订阅
