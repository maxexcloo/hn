# ARCHITECTURE.md - Technical Design

## Overview

Self-hostable Hacker News frontend with server-side rendering and client-side filtering.

## Core Components

### API Integration
- **Data Source**: Hacker News Firebase API
- **Batch Processing**: 20 stories per batch with 100ms delays
- **Rate Limiting**: Built-in delays to respect API limits

### Caching System
- **Cache Duration**: 5-minute expiry with automatic refresh
- **Cache Size**: 1000-item limit with LRU eviction
- **Cache Keys**: `all-stories` for lists, `comments-${storyId}` for threads

### Client-Side Filtering
- **Filter Types**: Top 10, Top 20, Top 50%, All stories
- **Hash Routing**: Shareable URLs using hash fragments
- **Grouping**: Stories grouped by day with separate filtering

## Data Flow

1. **Story Loading**: Client requests → Cache check → API fetch → Filter → Render
2. **Comment Loading**: Story ID validation → Cache check → Recursive fetch → Thread building → Render
3. **Client Filtering**: Parse JSON → Group by day → Apply filter → Update DOM

## Security

- **Content Security Policy**: Helmet middleware with restricted directives
- **Input Validation**: Story ID validation with regex patterns
- **Error Handling**: Graceful error pages with user-friendly messages

## Technology Stack

### Backend
- **Runtime**: Node.js 22+
- **Framework**: Express.js with EJS templating
- **Security**: Helmet middleware

### Frontend
- **Styling**: Tailwind CSS v4
- **JavaScript**: Vanilla ES6+ with event delegation
- **Theme**: Dark mode via `prefers-color-scheme`

---

*Technical architecture documentation for the HN project.*
