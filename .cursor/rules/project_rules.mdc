# Fluth Project Structure Rules

This document describes the folder structure and component functionality of the Fluth project.

## Project Overview

Fluth is a Promise-like asynchronous flow control library that provides powerful stream programming capabilities.

## Directory Structure

### 📁 Root Directory Files

- **`index.ts`** - Main entry file that exports all public APIs
- **`package.json`** - Project configuration file containing dependencies, scripts, and metadata
- **`README.md`** - Project documentation
- **`LICENSE`** - MIT open source license file
- **`CHANGELOG.md`** - Version update changelog
- **`pnpm-lock.yaml`** - pnpm package manager lock file

### 📁 Source Code Directory (`src/`)

Core business logic code containing the following modules:

- **`observable.ts`** - Observable class implementation providing core observable object functionality
- **`stream.ts`** - Stream class implementation extending Observable with streaming operations
- **`factory.ts`** - Factory functions for creating Stream instances
- **`operator.ts`** - Operator implementations providing various stream operations (combine, merge, race, etc.)
- **`plugins.ts`** - Plugin system providing delay, throttle, debounce and other functional plugins
- **`utils.ts`** - Utility function collection

### 📁 Test Directory (`test/`)

Contains all test files corresponding to the `src/` directory structure:

- **`factory.test.ts`** - Factory function tests
- **`observer.test.ts`** - Observable related tests
- **`operator.test.ts`** - Operator functionality tests
- **`plugins.test.ts`** - Plugin system tests
- **`stream.test.ts`** - Stream class tests
- **`utils.ts`** - Test utility functions

### 📁 Configuration Directories

#### `.github/workflows/`

GitHub Actions workflow configurations:

- **`check.yml`** - Code checking workflow
- **`release-publish.yml`** - Release workflow

#### `.husky/`

Git hooks configuration:

- **`commit-msg`** - Commit message format checking
- **`pre-commit`** - Pre-commit code checking

### 📁 Configuration Files

#### TypeScript Configuration

- **`tsconfig.json`** - Base TypeScript configuration
- **`tsconfig.cjs.json`** - CommonJS module build configuration
- **`tsconfig.mjs.json`** - ES module build configuration

#### Code Quality Tools

- **`eslint.config.mjs`** - ESLint code checking configuration
- **`.lintstagedrc.cjs`** - lint-staged configuration for pre-commit checking
- **`.prettierrc.json`** - Prettier code formatting configuration
- **`.prettierignore`** - Prettier ignore file configuration
- **`.commitlintrc.mjs`** - Commit message convention configuration

#### Test Configuration

- **`vitest.config.js`** - Vitest testing framework configuration

#### Other Configuration

- **`.gitignore`** - Git ignore file configuration

## Development Standards

### Language Requirements

- **All code must be written in English** - Variable names, function names, class names, and all identifiers
- **All comments must be in English** - Including JSDoc comments, inline comments, and documentation
- **All commit messages must be in English** - Following conventional commit format
- **All documentation must be in English** - README, API docs, and inline documentation

### File Naming Conventions

- Source files use lowercase letters and hyphens
- Test files end with `.test.ts`
- Configuration files named according to tool requirements

### Code Organization Standards

- Core functionality code in `src/` directory
- Each module has corresponding test files
- Public APIs exported uniformly through `index.ts`
- Plugins and operators organized in separate files

### Build Output

- Supports both CommonJS and ES Module formats
- Build artifacts output to `dist/` directory (created during build)
- Includes type declaration files

## Dependency Management

- Uses pnpm as package manager
- Production dependency: `limu` (immutable data processing)
- Development dependencies include testing, building, code quality checking tools

## Release Process

1. Code commits trigger pre-commit hooks
2. GitHub Actions execute automated checks
3. Use standard-version to manage versions and CHANGELOG
4. Automatic publishing to npm

## Code Quality Enhancement Suggestions

### 1. Documentation Improvements

- Add comprehensive JSDoc comments to all public APIs
- Create detailed API documentation with examples
- All comments should use english language

### 2. Testing Enhancements

- Increase test coverage to 100%
- Add integration tests
- Add performance benchmarks
- Add edge case testing

### 3. Type Safety

- Strengthen TypeScript strict mode settings
- Add more specific type definitions
- Use branded types for better type safety

### 4. Performance Optimizations

- Add performance monitoring
- Implement lazy loading where applicable
- Optimize memory usage in stream operations

### 5. Developer Experience

- Add VS Code extension recommendations
- Create development setup guide
- Add debugging configuration
- Implement better error messages

### 6. CI/CD Improvements

- Add automated security scanning
- Implement automated dependency updates
- Add cross-platform testing
- Add bundle size monitoring

### 7. Code Organization

- Consider splitting large files into smaller modules
- Implement barrel exports for better tree-shaking
- Add architectural decision records (ADRs)

---

_This document describes the overall architecture and organizational rules of the Fluth project, helping developers understand the project structure and contribute code effectively._
