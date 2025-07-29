# CLAUDE.md - Development Guide

## Project Overview
**Purpose**: Self-hostable Hacker News frontend with client-side filtering and dark mode  
**Status**: Active

## Commands
```bash
# Development
npm run dev      # Start development server with hot reload
npm run build    # Build CSS with Tailwind
npm start        # Start production server

# Docker
docker-compose up -d  # Run containerized version
```

## Tech Stack
- **Language**: JavaScript (Node.js 22)
- **Framework**: Express.js with EJS templating
- **Styling**: Tailwind CSS v4
- **Container**: Docker with multi-arch support

## Code Standards

### Organization
- **Config/Data**: Alphabetical and recursive (imports, dependencies, object keys)
- **Files**: Alphabetical in documentation and directories
- **Functions**: Group by purpose, alphabetical within groups
- **Variables**: Alphabetical within scope

### Quality
- **Comments**: Minimal - only for complex business logic
- **Documentation**: Update README.md and docs with every feature change
- **Formatting**: No custom formatter - rely on consistent style
- **KISS principle**: Keep it simple - prefer readable code over clever code
- **Naming**: camelCase for variables/functions, kebab-case for CSS classes
- **Trailing newlines**: Required in all files

## Project Structure
- **index.js**: Main server file with all routing and caching logic
- **package.json**: Dependencies and build scripts (alphabetically sorted)
- **public/**: Static assets (style.css input, output.css generated)
- **views/**: EJS templates for server-side rendering
- **views/partials/**: Reusable template components (comment threading)

## Git Workflow
```bash
# After every change
npm run build && npm start  # Test locally
git add . && git commit -m "type: description"

# Always commit after verified working changes
# Keep commits small and focused
```

## Architecture Notes
- **5-minute cache**: Stories and comments cached with auto-refresh
- **Client-side filtering**: Instant Top 10/20/50%, Homepage, All switching
- **Hash routing**: Shareable URLs like `/#top-20`
- **Security**: Helmet middleware with CSP headers
- **Docker**: Multi-stage build with dev dependency pruning

---

*Simple context for AI assistants working on this open source project.*