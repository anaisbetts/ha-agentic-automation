# Home Assistant Agentic Automation

## Build & Test Commands

- Run server: `bun run ./server/index.ts` or `bun dev`
- Debug mode: `bun dev:debug`
- Run tests: `bun test` (all tests)
- Run single test: `bun test server/lib/file.test.ts`
- Lint & typecheck: `bun lint` (eslint, tsc, prettier)
- Fix linting: `bun f`

## Code Style Guidelines

- TypeScript with strict type checking throughout
- Use RxJS Observables for event streams and async operations
- Implement modular patterns with separate files for specific functionality
- Use debug logging with format string syntax (e.g., `d('message: %o', obj)`)
- To log floating point values to debug, use %d, not %f
- Error handling: Use async/await with try/catch, validate in testMode
- Naming: camelCase for variables/functions, PascalCase for types/interfaces
- Create reusable utility files for common functionality
- Use environment variables for configuration (HA_BASE_URL, HA_TOKEN, etc.)
- Add files to components/ui via the shadcn CLI tool
