# Contributing to @pegasusheavy/ngx-bun

Thank you for your interest in contributing to @pegasusheavy/ngx-bun! This document provides guidelines and information for contributors.

## Development Setup

### Prerequisites

- [Bun](https://bun.sh/) 1.0.0 or higher
- [Node.js](https://nodejs.org/) 20.0.0 or higher
- [pnpm](https://pnpm.io/) 8.0.0 or higher

### Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ngx-bun.git
   cd ngx-bun
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Build the project:
   ```bash
   pnpm build:all
   ```

### Project Structure

```
ngx-bun/
├── src/                    # Main source code
│   ├── server/            # SSR server components
│   └── prerender/         # SSG/prerendering utilities
├── schematics-src/        # Angular schematics source
│   ├── ng-add/           # ng add schematic
│   └── server/           # Server file generation
├── builders-src/          # Angular CLI builders source
│   ├── serve/            # Development server builder
│   └── prerender/        # Prerender builder
├── schematics/           # Compiled schematics (generated)
├── builders/             # Compiled builders (generated)
└── dist/                 # Compiled library (generated)
```

### Available Scripts

- `pnpm build` - Build the main library
- `pnpm build:schematics` - Build Angular schematics
- `pnpm build:builders` - Build Angular CLI builders
- `pnpm build:all` - Build everything
- `pnpm test` - Run tests
- `pnpm lint` - Run linter

## Making Changes

### Code Style

- Use TypeScript for all source files
- Follow the existing code style
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused

### Testing

- Write tests for new features
- Ensure existing tests pass
- Test with a real Angular application when possible

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
feat: add new caching strategy
fix: resolve memory leak in render cache
docs: update API documentation
chore: update dependencies
```

### Pull Requests

1. Create a feature branch from `main`
2. Make your changes
3. Run tests and linting
4. Push your branch and create a PR
5. Fill out the PR template
6. Wait for review

## Reporting Issues

When reporting issues, please include:

- Version of @pegasusheavy/ngx-bun
- Angular version
- Bun version
- Node.js version
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Error messages or logs

## Feature Requests

Feature requests are welcome! Please:

1. Check existing issues for duplicates
2. Describe the use case
3. Explain the expected behavior
4. Consider implementation complexity

## Code of Conduct

Please be respectful and constructive in all interactions. We're all here to build something great together.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
