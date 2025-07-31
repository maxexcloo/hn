# CLAUDE.md - Development Guide

## Project Overview
**Purpose**: Self-hostable Hacker News frontend with client-side filtering and dark mode
**Status**: Active
**Language**: JavaScript (Node.js 22+)

## Code Standards

### Organization
- **Config/Data**: Alphabetical and recursive (imports, dependencies, object keys, mise tasks)
- **Documentation**: Sort sections, lists, and references alphabetically when logical
- **Files**: Alphabetical in documentation and directories
- **Functions**: Group by purpose, alphabetical within groups
- **Variables**: Alphabetical within scope

### Quality
- **Comments**: Minimal - only for complex business logic
- **Documentation**: Update ARCHITECTURE.md and README.md with every feature change
- **Error handling**: Always handle API errors gracefully
- **Formatting**: Run `mise run fmt` before commits
- **KISS principle**: Keep it simple - prefer readable code over clever code
- **Naming**: camelCase for variables/functions, kebab-case for CSS classes
- **Testing**: No testing framework configured
- **Trailing newlines**: Required in all files

## Commands
```bash
# Build
mise run build           # Build CSS and check code

# Development
mise run dev             # Start development server with auto-rebuild

# Format
mise run fmt             # Code formatting (no formatter configured)

# Check
mise run check           # All validation (build)
```

## Development Guidelines

### Contribution Standards
- **Code Changes**: Follow sorting rules and maintain project standards
- **Documentation**: Keep all docs synchronized and cross-referenced
- **Feature Changes**: Update README.md and ARCHITECTURE.md when adding features

### Documentation Structure
- **ARCHITECTURE.md**: Technical design and implementation details
- **CLAUDE.md**: Development standards and project guidelines
- **README.md**: Tool overview and usage guide

## Error Handling Standards
- **Contextual errors**: Show meaningful error messages
- **Graceful degradation**: Handle API failures gracefully
- **Informative messages**: Include clear explanations for common issues
- **User-friendly output**: Clear feedback for user actions

## Project Structure
- **index.js**: Main server file with routing and caching logic
- **package.json**: Dependencies and build scripts
- **postcss.config.js**: PostCSS configuration for Tailwind CSS v4
- **public/**: Static assets (style.css input, output.css generated)
- **views/**: EJS templates for server-side rendering
- **views/partials/**: Reusable template components

## README Guidelines
- **Badges**: Include relevant status badges (license, status, docker, language)
- **Code examples**: Always include working examples in code blocks
- **Installation**: Provide copy-paste commands that work
- **Quick Start**: Get users running in under 5 minutes
- **Structure**: Title → Badges → Description → Quick Start → Features → Installation → Usage → Contributing

## Development Workflow Standards

### Environment Management
- Use **mise** for consistent development environments
- Define common tasks as mise scripts
- Pin tool versions in `.mise.toml`

### Required Development Tasks
- **build**: Build CSS and check code
- **check**: All validation (build)
- **dev**: Start development server with auto-rebuild
- **fmt**: Code formatting (no formatter configured)
- **test**: No testing framework configured

## Tech Stack
- **Backend**: Express.js with EJS templating
- **Frontend**: JavaScript (Node.js 22+)
- **Testing**: No testing framework configured

---

*Development guide for the HN open source project.*
