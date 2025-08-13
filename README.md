# Fluth

<div align="center">
  <img src="https://fluthjs.github.io/fluth-doc/logo.svg" alt="fluth-vue logo" width="120" height="120">

  <p style="margin-top: 20px;">A Promise-like Reactive Stream Library</p>
</div>

<div align="center">

[![codecov](https://img.shields.io/codecov/c/github/fluthjs/fluth?style=flat)](https://codecov.io/gh/fluthjs/fluth)
[![MIT License](https://img.shields.io/badge/license-MIT-green.svg?style=flat)](https://github.com/fluthjs/fluth/blob/master/LICENSE)
[![npm version](https://img.shields.io/npm/v/fluth.svg?style=flat)](https://www.npmjs.com/package/fluth)
[![npm downloads](https://img.shields.io/npm/dm/fluth.svg?style=flat)](https://www.npmjs.com/package/fluth)
[![GitHub stars](https://img.shields.io/github/stars/fluthjs/fluth?style=flat)](https://github.com/fluthjs/fluth/stargazers)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/fluthjs/fluth)

<div align="center">

[official website](https://fluthjs.github.io/fluth-doc/index.html)

</div>

<div align="center">

[English](./README.md) | [中文](./README.cn.md)

</div>

</div>

## 🚀 Features

- **🤞 Easy to Use**: Promise-like stream processing with chainable APIs
- **🔄 Reactive Programming**: Observable-based data streams
- **⚡ Async Control**: Powerful Promise-like async flow control
- **🛠️ Rich Operators**: A wide range of transformation and combination operators
- **🔌 Plugin System**: Extensible plugin mechanism for debugging and logging
- **💾 Immutable Operations**: Immutable data updates powered by limu
- **🎯 TypeScript**: Fully typed for a smooth developer experience

## 📦 Installation

```bash
# npm
npm install fluth

# yarn
yarn add fluth

# pnpm
pnpm add fluth
```

## Quick Start

```typescript
import { $ } from 'fluth'

// Create a stream
const stream$ = $()

// Listen for changes
stream$.then((value) => {
  console.log('received:', value)
})

// Emit value
stream$.next('Hello Fluth!')
```
