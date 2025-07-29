# HN

[![Node.js](https://img.shields.io/badge/node.js-22+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](Dockerfile)

Self-hostable Hacker News frontend with client-side filtering and dark mode support.

## Quick Start

Get up and running in under 5 minutes:

```bash
git clone https://github.com/maxexcloo/hn.git
cd hn
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
# Clone the repository
git clone https://github.com/maxexcloo/hn.git
cd hn

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

### Filtering Options

- **Top 10** - Best 10 stories per day by score
- **Top 20** - Best 20 stories per day by score  
- **Top 50%** - Top half of stories per day by score
- **All** - Complete story list sorted by time

### Comment Navigation

- Click comment headers to collapse/expand threads
- 12px indentation levels for nested replies
- Maintains state during browsing session

### Environment Variables

```bash
PORT=3000  # Server port (default: 3000)
```

## API

The application uses the official Hacker News Firebase API:

- **Stories**: `https://hacker-news.firebaseio.com/v0/topstories.json`
- **Items**: `https://hacker-news.firebaseio.com/v0/item/{id}.json`

## Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature-name`
3. **Follow** the code standards in `CLAUDE.md`
4. **Build** and test: `npm run build`
5. **Commit** changes: `git commit -m "feat: description"`
6. **Push** to branch: `git push origin feature-name`
7. **Open** a Pull Request

### Code Style

- Alphabetical ordering for variables, imports, and object keys
- Minimal comments (only for complex business logic)
- camelCase for variables/functions, kebab-case for CSS classes
- All files must end with trailing newlines

## License

MIT License - see [LICENSE](LICENSE) file for details.
