# HN

[![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-active-success)](https://img.shields.io/badge/status-active-success)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](Dockerfile)
[![Node.js](https://img.shields.io/badge/node.js-green.svg)](https://nodejs.org/)

Self-hostable Hacker News frontend with client-side filtering and dark mode support.

## Quick Start

```bash
npm install
npm run build
npm start
```

Visit `http://localhost:3000` and start browsing filtered Hacker News stories.

## Features

- **Collapsible comments** - Click to expand/collapse comment threads
- **Dark mode** - Automatic via `prefers-color-scheme`
- **Docker ready** - Multi-platform containers (linux/amd64, linux/arm64)
- **Hash routing** - Shareable URLs like `/#top-20`
- **Intelligent caching** - 5-minute cache with 1000-item limit and pre-loading
- **Security focused** - Helmet middleware with CSP headers
- **Server-side rendered** - Fast loading with Express.js and EJS
- **Smart filtering** - Top 10/20/50%, All with per-day grouping
- **Tailwind CSS v4** - Modern utility-first styling

## Installation

### Node.js (Recommended)

```bash
# Install dependencies
npm install

# Build CSS
npm run build

# Start the server
npm start
```

### Docker

```bash
# Using Docker Compose
docker-compose up -d

# Or build and run manually
docker build -t hn .
docker run -p 3000:3000 hn
```

## Usage

### Development

```bash
# Start development server with auto-rebuild
npm run dev

# Build CSS only
npm run build
```

### Environment Variables

```bash
PORT=3000  # Server port (default: 3000)
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make changes following the code standards in CLAUDE.md
4. Build and test: `npm run build`
5. Submit a pull request

## License

This project is licensed under the AGPL-3.0 License - see the [LICENSE](LICENSE) file for details.
