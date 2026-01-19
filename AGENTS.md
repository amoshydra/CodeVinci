# Agent Instructions

## Build & Development Commands

```bash
pnpm install           # Install dependencies
pnpm dev              # Start development server (Vite)
pnpm build            # Build for production (tsc -b && vite build)
pnpm lint             # Run ESLint on the codebase
pnpm preview          # Preview production build locally
pnpm panda codegen    # Generate PandaCSS styles (runs automatically on prepare)
```

Note: No test framework is currently configured in this project.

## Project Overview

This is a React + TypeScript web application called "codevinci" - a browser-based code editor and preview tool using esbuild for code transformation. Uses Vite as the bundler and PandaCSS for styling.

## Code Style Guidelines

### Imports

- External imports first, then relative imports
- Group related imports together without blank lines between them
- CSS imports (`import "./App.css"`) placed at the very top
- Named imports preferred over default imports
- Avoid bare specifiers - use full import paths

Example:
```tsx
import { lazy, Suspense } from 'react';
import { css } from '../../../styled-system/css';
import { EditorProps } from './interface';
import { someUtil } from '../utils/someUtil';
```

### Formatting & Structure

- 2 spaces for indentation
- No trailing whitespace
- Prefer single quotes for strings
- Avoid unnecessary comments
- Keep lines under 100 characters when practical
- Place interfaces/types above components in the same file
- Export named components, export default only for main entry points

### TypeScript

- Strict mode enabled (`strict: true` in tsconfig)
- Explicit type definitions using `interface` for objects
- Use generic types with `<K extends keyof...>` pattern for typed setters
- Use `as const` for tuple returns (`return [...] as const`)
- Mark all async functions as `async` explicitly
- Use `Promise<...>` types for function return types

Example:
```tsx
export interface EditorProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  onValueChange: (value: string) => void;
}

const updateSetting = useCallback(<K extends keyof UseSettingsReturn>(
  name: K, 
  value: UseSettingsReturn[K]
) => { ... }, []);

return [error, isLoading, result] as const;
```

### Naming Conventions

- **Components**: PascalCase (`Editor`, `Entry`, `Dialog`)
- **Functions/Hooks**: camelCase (`useSettings`, `esbuilderTranform`, `updateSetting`)
- **Constants**: camelCase (`initialCode`, `extensions`, `editorPreference`)
- **Interfaces**: PascalCase WITHOUT `I` prefix (`EditorProps`, `UseSettingsReturn`)
- **Type parameters**: Single capital letters (`K`, `T`, `R`)
- **Boolean**: Prefix with `is/has/can` (`isDisclaimerAccepted`, `isLoading`)
- **Event handlers**: Prefix with `on` (`onValueChange`, `onCodeChange`)

### React Patterns

- Custom hooks named with `use` prefix and placed in `services/` or feature folders
- Use `useCallback` for memoizing callbacks passed to children
- Use `useDeferredValue` for expensive computations
- Use `lazy()` for code splitting heavy components
- Destructure props in function signature
- Use styled components via PandaCSS: `css({...})` and `styled(...)`
- Use `css()` for dynamic styles, `styled()` for reusable components

Example:
```tsx
export const Entry = ({ code, onCodeChange, settings, ...props }: EntryProps) => {
  const deferredCode = useDeferredValue(code);
  return <div {...props} className={css({ height: 'full' })}>...</div>;
};
```

### Error Handling

- Use `try/catch` for synchronous operations
- Use `.catch()` for promise chains
- Manage error state explicitly with `useState<Error | null>(null)`
- Set error state and log to console in catch blocks
- Graceful degradation when dependencies fail to load

Example:
```tsx
const [error, setError] = useState<Error | null>(null);

await doSomething().catch((e) => {
  console.error("Failed to load", e);
  setError(e);
  return fallbackValue;
});
```

### File Organization

- `src/components/` - Reusable UI components
- `src/views/` - Feature-based page components (subdirectories: `editor/`, `viewer/`, `log/`, etc.)
- `src/services/` - Custom hooks and business logic (`useSettings.ts`, `useCodeStorage.ts`)
- `src/utils/` - Pure utility functions
- Interface files named `interface.ts` in component directories
- Utility functions in separate files (e.g., `toggleComment.util.ts`)

### Styling

- Use PandaCSS for all styling
- Import `css` from `styled-system/css` for inline styles
- Import `styled` from `styled-system/jsx` for styled components
- Use semantic color tokens (`stone.950`, not hex codes)
- Responsive values handled through PandaCSS breakpoints

### Linting & Type Checking

Always run before committing:
```bash
pnpm lint    # ESLint for code quality
pnpm build   # TypeScript compiler for type checking
```

No test framework configured - manual testing required.

### Environment

- Node version: 22.17.1 (managed by Volta)
- Package manager: pnpm
- TypeScript: 5.6.2
- React: 18.3.1
