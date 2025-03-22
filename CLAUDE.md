# CLAUDE.md

## Build & Development Commands
- `pnpm dev` - Run development server (Next.js + Mastra)
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run linter

## Code Style Guidelines
- **TypeScript**: Use strict mode with proper type definitions
- **Imports**: Group by external/internal, use absolute imports with `@/*` alias
- **Components**: Use functional components with named exports
- **Formatting**: 2-space indentation, trailing commas
- **Error Handling**: Use try/catch with specific error messages
- **Naming**: camelCase for variables/functions, PascalCase for components/classes
- **Agents/Tools**: Follow Mastra patterns for agent creation and tool implementation
- **Types**: Define interfaces for API responses, use zod for validation schemas

## Testing
- No testing framework established yet
- When adding tests, set up a single test command with Jest or Vitest

## Project Structure
- `/src/mastra` - Contains Mastra agents and tools
- `/src/app` - Next.js app directory with pages and API routes