# combine

将输入的[ stream ](/cn/api/index#stream)或者[ subjection ](/cn/api/index#subjection)进行结合，返回一个新的流

![image](/combine.drawio.svg)

- 类型

  ```typescript
  type combine: (...args: (Stream | Subjection)[]) => Stream;
  ```

- 详情

  - 所有输入的流都发出第一个数据后，新的流才会发出第一个数据
  - 所有输入的流取消订阅后，新的流也会取消订阅
  - 所有输入的流[ 结束 ](/cn/guide/base#结束)后，新的流也会结束
