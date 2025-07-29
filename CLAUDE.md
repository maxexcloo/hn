# HN Clone Project

## Architecture Overview
Self-hostable Hacker News clone following KISS principles with server-side rendering and intelligent caching.

## Implementation Stack
- **Node.js + Express** - Minimal web server (single file)
- **EJS templates** - Server-side rendering, no client frameworks
- **Tailwind CSS** - Utility-first styling, no custom CSS
- **Hacker News API** - Real-time data from `topstories.json`
- **Docker** - Multi-platform containerization
- **GitHub Actions** - Automated CI/CD pipeline

## Data Flow
1. **Fetch 1000 stories** from HN API for complete 7-day coverage
2. **Server-side 7-day filter** ensures fresh, relevant content
3. **Client-side filtering** enables instant Top 10/20/50%, Homepage, All switching
4. **Hash routing** provides shareable URLs (`/#top-20`)
5. **Pre-caching** loads popular stories for instant access

## Filter Logic (Per Day)
- **Top 10/20** - Highest-scoring N stories per day, time-sorted within day
- **Top 50%** - Top half of stories per day by score
- **Homepage** - All stories sorted chronologically (newest first)
- **All** - Complete 7-day dataset sorted chronologically
- **Story numbering** - Restarts 1-N for each day

## Story Types
- **External links** - Title → URL, hostname displayed
- **Text posts** (Ask HN, Show HN) - Title → comments page
- **Comment threads** - Collapsible, 12px indentation levels

## Caching Architecture
- **Story cache** - 5-minute expiry, auto-refresh, error fallback
- **Comment cache** - Per-story 5-minute expiry
- **Pre-cache strategy** - Top 20 stories from last 3 days on startup
- **Graceful degradation** - Serves stale cache on API failures

## Performance Features
- **Batch processing** - 20 stories/batch with 100ms delays
- **Client-side filtering** - Zero latency filter switching
- **Memory efficiency** - Only caches active content
- **API-friendly** - Rate limiting and timeout handling

## Code Organization
- **Alphabetical sorting** - Variables, functions, CSS classes, HTML attributes
- **Single trailing newlines** - All source files
- **Minimal dependencies** - Only essential packages
- **Clean structure** - No unnecessary abstractions

## Deployment
- **Docker-first** - Primary deployment method
- **GitHub Container Registry** - Automated multi-arch builds
- **Environment defaults** - No configuration required
- **Port 3000** - Standard Node.js convention
