# CLAUDE.md - Development Guide

## Project Overview
**Purpose**: Self-hostable Hacker News frontend with client-side filtering and dark mode  
**Status**: Active
**Language**: JavaScript (Node.js 22+)

## Code Standards

### Organization
- **Config/Data**: Alphabetical and recursive (imports, dependencies, object keys)
- **Documentation**: Sort alphabetically and recursively when it makes logical sense - apply to sections, subsections, lists, and references
- **Files**: Alphabetical in documentation and directories
- **Functions**: Group by purpose, alphabetical within groups
- **Variables**: Alphabetical within scope

### Quality
- **Comments**: Minimal - only for complex business logic
- **Documentation**: Update README.md and docs with every feature change
- **Error handling**: Always handle API errors gracefully
- **Formatting**: Run formatter before commits
- **KISS principle**: Keep it simple - prefer readable code over clever code
- **Naming**: camelCase for variables/functions, kebab-case for CSS classes
- **Testing**: No testing framework configured
- **Trailing newlines**: Required in all files

## Commands
```bash
# Build
npm run build    # Build CSS and check code quality

# Development
npm run dev      # Start development with auto-rebuild
npm test         # No tests configured
```

## Development Guidelines

### Documentation Structure
- **ARCHITECTURE.md**: Technical design and implementation details
- **CLAUDE.md**: Development standards and project guidelines (this file)
- **README.md**: Tool overview and usage guide

### Contribution Standards
- **Code Changes**: Follow sorting rules and maintain project standards
- **Documentation**: Keep all docs synchronized and cross-referenced
- **Feature Changes**: Update README.md and ARCHITECTURE.md when adding features

## Development Workflow Standards

### Required Development Tasks
- **build**: Build CSS and check code quality
- **dev**: Development with auto-rebuild

## Error Handling Standards
- **Contextual errors**: Show meaningful error messages
- **Graceful degradation**: Handle API failures gracefully
- **Informative messages**: Include clear explanations for common issues
- **User-friendly output**: Clear feedback for user actions

## Project Structure
- **index.js**: Main server file with routing and caching logic
- **package.json**: Dependencies and build scripts (alphabetically sorted)
- **postcss.config.js**: PostCSS configuration for Tailwind CSS v4
- **public/**: Static assets (style.css input, output.css generated)
- **views/**: EJS templates for server-side rendering
- **views/partials/**: Reusable template components

## Project Specs
- **API**: Hacker News Firebase API (`topstories.json`, item endpoints)
- **Architecture**: Server-side rendering with client-side filtering
- **Cache**: 5-minute expiry with 1000-item size limit, auto-refresh on startup
- **Comments**: Collapsible threading with 12px indentation levels, event delegation
- **CSP**: Helmet middleware with Content Security Policy (no inline handlers)
- **Deployment**: Docker-first with multi-arch support (linux/amd64, linux/arm64)
- **Filtering**: Client-side Top 10/20/50%, All with per-day grouping
- **Performance**: Batch processing (20 stories/batch, 100ms delays)
- **Port**: 3000 (configurable via PORT env var)
- **Routing**: Hash-based (`/#top-20`) for shareable URLs
- **Styling**: Tailwind CSS v4 utility-first, dark mode via `prefers-color-scheme`

## README Guidelines
- **Badges**: Include relevant status badges (build, version, license)
- **Code examples**: Always include working examples in code blocks
- **Installation**: Provide copy-paste commands that work
- **Quick Start**: Get users running in under 5 minutes
- **Structure**: Title → Description → Quick Start → Features → Installation → Usage → Contributing

## Tech Stack
- **Framework**: Express.js with EJS templating
- **Language**: JavaScript (Node.js 22+)
- **Testing**: No testing framework configured

## Git Workflow
```bash
# After every change
npm run build && git add . && git commit -m "type: description"

# Always commit after verified working changes
# Keep commits small and focused
```

---

*Development guide for the HN open source project.*
