# ARCHITECTURE.md - Technical Design

## Overview

HN is a self-hostable Hacker News frontend with server-side EJS rendering and client-side story filtering. The application treats Hacker News API content as untrusted input and bounds outbound work to preserve availability.

## Core Components

### API Integration

- **Concurrency**: One shared 20-request limiter covers stories and comments
- **Data Source**: Hacker News Firebase API
- **Response Limit**: One MiB per response
- **Story Limit**: 500 top-story items per refresh
- **Timeout**: Ten seconds with request abortion

Comment traversal is limited to 500 comments and 20 nesting levels per story. At most five comment trees can load concurrently, and concurrent cold requests for the same resource share one in-flight promise.

### Caching System

- **Cache Duration**: Five minutes with stale-data fallback
- **Cache Keys**: `all-stories` for lists and `comments-${storyId}` for threads
- **Cache Size**: 100 entries
- **Eviction**: Least recently used
- **Refresh**: A completion-based background timer prevents overlapping refresh cycles

Popular comments are loaded on demand rather than preloaded, preventing startup request amplification.

### Client-Side Filtering

- **Filter Types**: Top 10, Top 20, Top 50%, and All stories
- **Grouping**: Stories grouped and filtered independently by local calendar day
- **Hash Routing**: Shareable filters through hash fragments
- **Rendering**: DOM construction with `textContent`; story data never enters `innerHTML`

### Delivery

- **Pull Requests**: Run repository checks, then build both container architectures without publishing
- **Main and Version Tags**: Run checks, then publish tagged images to GHCR
- **Metadata**: Publish BuildKit provenance and a software bill of materials
- **Maintenance**: Renovate tracks npm, Docker, GitHub Actions, and Mise dependencies

### Operations

- **Cache Status**: `/cache-status` exposes entry age and expiry information
- **Liveness**: `/health` reports process availability
- **Readiness**: `/ready` returns 503 before stories are available and reports stale-cache degradation

### Security

- **Comment HTML**: Allow-list sanitisation for Hacker News formatting
- **Content Security Policy**: Self-hosted scripts and styles without `unsafe-inline`
- **External URLs**: HTTP and HTTPS protocol allow-listing
- **Input Validation**: Positive numeric story IDs and allow-listed filters
- **Response Escaping**: Script-closing characters escaped in serialised bootstrap data

## Data Flow

1. **Story Loading**: Request → fresh-cache check → coalesced API refresh → seven-day filter → escaped bootstrap data → DOM rendering
2. **Comment Loading**: ID validation → fresh-cache check → bounded recursive fetch → HTML sanitisation → EJS rendering
3. **Failure Handling**: API failure → stale-cache fallback → degraded readiness, or a user-facing 503 page when no cache exists
4. **Refresh**: Completed background refresh → five-minute delay → next refresh

## Testing

Node's built-in test runner covers concurrency, request coalescing, stale-cache fallback, input normalisation, sanitisation, CSP, route ordering, and readiness. `mise run check` validates the GitHub Actions workflow and Dockerfile before building CSS, checking JavaScript syntax, running tests, and verifying formatting.

## Technology Stack

### Backend

- **Framework**: Express.js with EJS templates
- **Runtime**: Node.js 24+
- **Security**: Helmet and sanitize-html

### Frontend

- **JavaScript**: Vanilla ES6+ DOM APIs
- **Styling**: Tailwind CSS v4
- **Theme**: Dark mode via `prefers-color-scheme`

---

_Technical architecture documentation for the HN project._
