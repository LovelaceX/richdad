# Contributing to RichDad

Thank you for your interest in contributing to RichDad! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Style](#code-style)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/richdad.git`
3. Add upstream remote: `git remote add upstream https://github.com/LovelaceX/richdad.git`
4. Create a feature branch: `git checkout -b feature/your-feature-name`

## Development Setup

### Prerequisites

- Node.js 18+
- Rust (for Tauri)
- pnpm or npm

### Installation

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri:build
```

### Project Structure

```
richdad-tauri/
├── src/
│   ├── renderer/          # React frontend
│   │   ├── components/    # UI components
│   │   ├── pages/         # Page components
│   │   ├── stores/        # Zustand state stores
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and helpers
│   └── services/          # Business logic and API services
├── src-tauri/             # Tauri/Rust backend
├── public/                # Static assets
└── package.json
```

## Code Style

### TypeScript

- Use TypeScript strict mode
- Define explicit types for function parameters and return values
- Use interfaces for object shapes, types for unions/primitives
- Avoid `any` - use `unknown` if type is truly unknown

```typescript
// Good
interface UserProfile {
  name: string
  riskTolerance: 'conservative' | 'moderate' | 'aggressive'
}

function calculateRisk(profile: UserProfile): number {
  // implementation
}

// Avoid
function calculateRisk(profile: any): any {
  // implementation
}
```

### React Components

- Use functional components with hooks
- Use Zustand for state management
- Keep components focused and composable
- Use Tailwind CSS for styling

```typescript
// Good
export function TradeButton({ symbol, action }: TradeButtonProps) {
  const executeOrder = useMarketStore(state => state.executeOrder)

  return (
    <button
      onClick={() => executeOrder(symbol, action)}
      className="px-4 py-2 bg-terminal-amber text-black rounded"
    >
      {action} {symbol}
    </button>
  )
}
```

### Tailwind CSS

- Follow the existing color scheme (terminal-* colors)
- Use the design system classes consistently
- Mobile-first responsive design when applicable

### Commit Messages

Use conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes

Examples:
```
feat(chart): add candlestick pattern detection
fix(api): handle rate limit errors gracefully
docs(readme): update installation instructions
```

## Making Changes

1. **Keep changes focused**: One feature or fix per PR
2. **Write tests**: For new features and bug fixes when applicable
3. **Update documentation**: Keep README and comments current
4. **Follow existing patterns**: Match the style of surrounding code

### Before Submitting

```bash
# Type check
npx tsc --noEmit

# Lint (if configured)
npm run lint

# Test build
npm run tauri:build
```

## Pull Request Process

1. Update the README.md with details of changes if applicable
2. Update the CHANGELOG.md following Keep a Changelog format
3. Ensure all TypeScript errors are resolved
4. Request review from maintainers

### PR Title Format

```
type(scope): Brief description
```

Example: `feat(ai): add pattern recognition to recommendations`

### PR Description Template

```markdown
## Summary
Brief description of what this PR does.

## Changes
- Change 1
- Change 2

## Testing
How was this tested?

## Screenshots (if applicable)
```

## Reporting Issues

### Bug Reports

Include:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- System info (OS, app version)
- Screenshots if applicable

### Feature Requests

Include:
- Clear description of the feature
- Use case / problem it solves
- Proposed implementation (optional)

## Questions?

Feel free to open an issue with the `question` label or start a discussion.

---

Thank you for contributing to RichDad!
