# ARCHITECTURE.md - Technical Design

## System Overview
**Purpose**: Self-hostable Hacker News frontend with client-side filtering and dark mode  
**Architecture**: Server-side rendering with Express.js, client-side filtering with vanilla JavaScript  
**Data Source**: Hacker News Firebase API

## Core Components

### API Integration
- **Data Source**: Hacker News Firebase API (`topstories.json`, item endpoints)
- **Batch Processing**: 20 stories per batch with 100ms delays to respect API limits
- **Error Handling**: Graceful degradation with timeout handling (5s per story, 10s for lists)
- **Rate Limiting**: Built-in delays and batching to avoid overwhelming the API

### Caching System
- **Cache Duration**: 5-minute expiry with automatic refresh
- **Cache Size**: 1000-item limit with LRU eviction
- **Cache Keys**: `all-stories` for story lists, `comments-${storyId}` for comment threads
- **Pre-loading**: Automatic cache warming on startup and periodic refresh
- **Pre-caching**: Popular comment threads cached proactively

### Client-Side Filtering
- **Filter Types**: Top 10, Top 20, Top 50%, All stories
- **Grouping**: Stories grouped by day with separate filtering per day
- **Hash Routing**: Shareable URLs using hash fragments (`/#top-20`)
- **Real-time Updates**: Dynamic filtering without page reloads

### Comment System
- **Data Structure**: Recursive comment trees with nested children
- **Rendering**: Server-side EJS templates with recursive partials
- **Interaction**: Client-side collapsible threading with event delegation
- **Threading**: 12px indentation levels for visual hierarchy

## Data Flow

### Story Loading Process
1. Client requests homepage
2. Server checks cache for `all-stories` key
3. If cache miss or expired:
   - Fetch top 1000 story IDs from API
   - Batch fetch story details (20 per batch)
   - Filter and validate stories
   - Cache results with timestamp
4. Filter to last 7 days
5. Render page with story data embedded as JSON

### Comment Loading Process
1. Client requests `/comments/:id`
2. Server validates story ID format
3. Check cache for `comments-${storyId}` key
4. If cache miss or expired:
   - Fetch story details from API
   - Recursively fetch all comment threads
   - Build nested comment structure
   - Cache complete comment tree
5. Render comments page with EJS templates

### Client-Side Filtering
1. Parse embedded story JSON data
2. Group stories by publication date
3. Apply selected filter per day group
4. Sort by score (for percentile filters) or time
5. Render filtered stories with day headers
6. Update URL hash and filter button states

## Security Architecture

### Content Security Policy
- **Helmet Middleware**: CSP headers with restricted directives
- **Script Sources**: Self and unsafe-inline for embedded filtering code
- **Style Sources**: Self and unsafe-inline for Tailwind CSS
- **Default Sources**: Self-only for all other resources

### Input Validation
- **Story ID Validation**: Regex pattern `/^\d+$/` with positive integer check
- **Error Handling**: Graceful error pages with user-friendly messages
- **Timeout Protection**: Request timeouts to prevent hanging connections

## Performance Optimizations

### Caching Strategy
- **Multi-level Caching**: In-memory cache with size limits and TTL
- **Cache Warming**: Proactive loading on startup and periodic refresh
- **Stale Data Fallback**: Return expired cache data during API failures

### API Efficiency
- **Batch Processing**: Minimize API calls with batched requests
- **Request Limiting**: Built-in delays and concurrency limits
- **Error Recovery**: Continue processing despite individual failures

### Client Optimization
- **Event Delegation**: Single event listener for all comment interactions
- **Hash Routing**: Client-side navigation without server requests
- **Embedded Data**: Story data included in initial page load

## Deployment Architecture

### Container Strategy
- **Multi-platform**: Support for linux/amd64 and linux/arm64
- **Single Container**: All-in-one deployment with Node.js runtime
- **Health Checks**: `/health` and `/ready` endpoints for monitoring
- **Graceful Shutdown**: SIGTERM/SIGINT handling with connection cleanup

### Environment Configuration
- **Port Configuration**: `PORT` environment variable (default: 3000)
- **Process Management**: Built-in signal handling for container orchestration

## Monitoring and Debugging

### Cache Monitoring
- **Cache Status Endpoint**: `/cache-status` for debugging cache state
- **Cache Metrics**: Size, entry ages, and expiration times
- **Performance Logging**: Cache hits/misses and API call timing

### Error Handling
- **Comprehensive Logging**: Detailed error messages with context
- **Fallback Strategies**: Graceful degradation for API failures
- **User-Friendly Errors**: Custom error pages with helpful messages

## Technology Stack

### Backend
- **Runtime**: Node.js 22+
- **Framework**: Express.js 5.x with EJS templating
- **Security**: Helmet middleware for security headers
- **HTTP Client**: Native HTTPS module for API requests

### Frontend
- **Styling**: Tailwind CSS v4 with PostCSS processing
- **JavaScript**: Vanilla ES6+ with event delegation
- **Theme Support**: CSS `prefers-color-scheme` media queries
- **Routing**: Hash-based client-side routing

### Build System
- **CSS Processing**: PostCSS with Tailwind CSS plugin
- **Development**: Nodemon for auto-restart during development
- **Production**: Direct Node.js execution

---

*Technical architecture documentation for the HN frontend project.*