# ARCHITECTURE.md - Technical Design

## Overview

Self-hostable Hacker News frontend with server-side rendering and client-side filtering.

## Core Components

### API Integration
- **Batch Processing**: 20 stories per batch with 100ms delays
- **Data Source**: Hacker News Firebase API
- **Rate Limiting**: Built-in delays to respect API limits

### Caching System
- **Cache Duration**: 5-minute expiry with automatic refresh
- **Cache Keys**: `all-stories` for lists, `comments-${storyId}` for threads
- **Cache Size**: 1000-item limit with LRU eviction

### Client-Side Filtering
- **Filter Types**: Top 10, Top 20, Top 50%, All stories
- **Grouping**: Stories grouped by day with separate filtering
- **Hash Routing**: Shareable URLs using hash fragments

## Data Flow

1. **Story Loading**: Client requests → Cache check → API fetch → Filter → Render
2. **Comment Loading**: Story ID validation → Cache check → Recursive fetch → Thread building → Render
3. **Client Filtering**: Parse JSON → Group by day → Apply filter → Update DOM

## Security

- **Content Security Policy**: Helmet middleware with restricted directives
- **Error Handling**: Graceful error pages with user-friendly messages
- **Input Validation**: Story ID validation with regex patterns

## Technology Stack

### Backend
- **Framework**: Express.js with EJS templating
- **Runtime**: Node.js 22+
- **Security**: Helmet middleware

### Frontend
- **JavaScript**: Vanilla ES6+ with event delegation
- **Styling**: Tailwind CSS v4
- **Theme**: Dark mode via `prefers-color-scheme`

---

*Technical architecture documentation for the HN project.*
