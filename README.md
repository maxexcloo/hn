# HN

Lightweight, self-hostable Hacker News clone.

## Usage

```bash
docker-compose up -d
```

Visit `http://localhost:3000`

## Development

```bash
npm install
npm run dev
```

## Features

- **KISS principle** - Simple, clean codebase
- **Server-side rendered** - Fast loading, no client frameworks
- **Smart filtering** - Top 10/20/50%, Homepage, All with per-day limits
- **Dark mode** - Automatic via `prefers-color-scheme`
- **Intelligent caching** - 5-minute cache with pre-loading
- **Hash routing** - Shareable URLs like `/#top-20`
- **Docker ready** - Multi-platform containers
- **GitHub Actions** - Automated builds
