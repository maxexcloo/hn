# HN

[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](Dockerfile)
[![Licence](https://img.shields.io/badge/licence-AGPL--3.0-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node.js-24%2B-green.svg)](https://nodejs.org/)
[![Status](https://img.shields.io/badge/status-active-success)](https://img.shields.io/badge/status-active-success)

Self-hostable Hacker News frontend with secure server-side rendering, client-side filtering, and automatic dark mode.

## Quick Start

```bash
npm ci
npm run build
npm start
```

Visit `http://localhost:3000` to browse filtered Hacker News stories.

## Features

- **Accessible comments** — Collapse and expand comment threads with pointer or keyboard controls
- **Bounded API access** — Shared concurrency, depth, response-size, and timeout limits
- **Dark mode** — Automatic via `prefers-color-scheme`
- **Docker ready** — Health-checked multi-platform containers for linux/amd64 and linux/arm64
- **Graceful degradation** — Stale-cache fallback and informative upstream error pages
- **Hash routing** — Shareable URLs such as `/#top-20`
- **Intelligent caching** — Five-minute, 100-entry LRU cache with request coalescing
- **Secure rendering** — Allow-list comment sanitisation and a strict Content Security Policy
- **Smart filtering** — Per-day Top 10, Top 20, Top 50%, and All filters
- **Supply-chain metadata** — Multi-architecture images with provenance and an SBOM
- **Tailwind CSS v4** — Utility-first styling

## Installation

### Docker

```bash
# Use the published image
docker compose up -d

# Or build and run locally
docker build -t hn .
docker run --publish 3000:3000 hn
```

### Node.js

Node.js 24 or newer is required. The repository pins Node.js 24.19.0 through Mise.

```bash
# Install dependencies exactly as locked
npm ci

# Build CSS
npm run build

# Start the server
npm start
```

## Usage

### Development

```bash
# Start the development server with automatic restart
npm run dev

# Run the complete validation suite
npm run check

# Run tests only
npm test
```

Equivalent Mise tasks are available through `mise run build`, `mise run check`, `mise run dev`, `mise run fmt`, `mise run lint`, `mise run setup`, and `mise run test`.

### Environment Variables

```bash
PORT=3000  # Server port; defaults to 3000
```

### Operational Endpoints

- `/cache-status` — LRU cache entries and ages
- `/health` — Process liveness
- `/ready` — Story-data readiness and degraded-state information

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature-name`.
3. Follow the standards in [AGENTS.md](AGENTS.md).
4. Run `mise run fmt` and `mise run check`.
5. Submit a pull request.

## Licence

This project is licensed under AGPL-3.0. See [LICENSE](LICENSE) for details.
