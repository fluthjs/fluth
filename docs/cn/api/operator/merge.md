# merge

将输入的[ stream ](/cn/api/index#stream)或者[ subjection ](/cn/api/index#subjection)进行合并，返回一个新的流

![image](/merge.drawio.svg)

- 类型

  ```typescript
  type merge: (...args: (Stream | Subjection)[]) => Stream;
  ```

- 详情

  - 流的合并操作指的是按照时间顺序，只要有流推送数据，都会被推送到新的流
  - 所有输入的流取消订阅后，新的流也会取消订阅
  - 所有输入的流[ 结束 ](/cn/guide/base#结束)后，新的流也会结束
