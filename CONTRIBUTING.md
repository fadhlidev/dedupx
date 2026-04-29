# Contributing to DedupX

Thank you for your interest in contributing to DedupX!

## Development Workflow

1. Clone the repository
2. Enter the development environment: `nix develop`
3. Install dependencies: `bun install`
4. Make your changes
5. Run tests: `bun test`
6. Build: `bun run build`

## Code Style

- Use TypeScript with strict typing
- Use `@/` path aliases instead of relative imports
- Run lint/typecheck before submitting PR

## Submitting a Pull Request

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes and commit them
4. Push to your fork
5. Open a pull request

## Commit Message Format

Use conventional commits:

- `add:` for new features
- `fix:` for bug fixes
- `update:` for enhancements
- `refactor:` for code refactoring
- `test:` for adding tests
- `docs:` for documentation changes

Example: `add: new fuzzy matching comparator`

## Reporting Issues

Please open an issue at https://github.com/fadhlidev/dedupx/issues with:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details