# CLAUDE.md - Development Guide

## Project Overview
**Purpose**: Self-hostable Hacker News frontend with client-side filtering and dark mode  
**Status**: Active

## Commands
```bash
# Development
npm run dev      # Start development
npm test         # No tests configured
npm run build    # Check code quality via build

# Build
npm run build    # Build for production
```

## Tech Stack
- **Language**: JavaScript (Node.js 22)
- **Framework**: Express.js with EJS templating
- **Testing**: No testing framework configured

## Code Standards

### Organization
- **Config/Data**: Alphabetical and recursive (imports, dependencies, object keys)
- **Documentation**: Sort sections, lists, and references alphabetically when logical
- **Files**: Alphabetical in documentation and directories
- **Functions**: Group by purpose, alphabetical within groups
- **Variables**: Alphabetical within scope

### Quality
- **Comments**: Minimal - only for complex business logic
- **Documentation**: Update README.md and docs with every feature change
- **Formatting**: Run formatter before commits
- **KISS principle**: Keep it simple - prefer readable code over clever code
- **Naming**: camelCase for variables/functions, kebab-case for CSS classes
- **Trailing newlines**: Required in all files

## Project Specs
- **API**: Hacker News Firebase API (`topstories.json`, item endpoints)
- **Architecture**: Server-side rendering with client-side filtering
- **Cache**: 5-minute expiry with 1000-item size limit, auto-refresh on startup
- **Comments**: Collapsible threading with 12px indentation levels
- **Deployment**: Docker-first with multi-arch support (linux/amd64, linux/arm64)
- **Filtering**: Client-side Top 10/20/50%, Homepage, All with per-day grouping
- **Performance**: Batch processing (20 stories/batch, 100ms delays)
- **Port**: 3000 (configurable via PORT env var)
- **Routing**: Hash-based (`/#top-20`) for shareable URLs
- **Security**: Helmet middleware with CSP headers
- **Styling**: Tailwind CSS v4 utility-first, dark mode via `prefers-color-scheme`

## Project Structure
- **index.js**: Main server file with routing and caching logic
- **package.json**: Dependencies and build scripts (alphabetically sorted)
- **public/**: Static assets (style.css input, output.css generated)
- **views/**: EJS templates for server-side rendering
- **views/partials/**: Reusable template components

## Git Workflow
```bash
# After every change
npm run build && npm start && git add . && git commit -m "type: description"

# Always commit after verified working changes
# Keep commits small and focused
```

---

*Simple context for AI assistants working on this open source project.*
