# HN Frontend Project

## Architecture Overview
Self-hostable Hacker News frontend following KISS principles with server-side rendering and intelligent caching.

## Caching Architecture
- **Comment cache** - Per-story 5-minute expiry
- **Graceful degradation** - Serves stale cache on API failures
- **Pre-cache strategy** - Top 20 stories from last 3 days on startup
- **Story cache** - 5-minute expiry, auto-refresh, error fallback

## Code Organization
- **Alphabetical sorting** - Variables, functions, CSS classes, HTML attributes
- **Clean structure** - No unnecessary abstractions
- **Minimal dependencies** - Only essential packages
- **Single trailing newlines** - All source files

## Data Flow
1. **Client-side filtering** enables instant Top 10/20/50%, Homepage, All switching
2. **Fetch 1000 stories** from HN API for complete 7-day coverage
3. **Hash routing** provides shareable URLs (`/#top-20`)
4. **Pre-caching** loads popular stories for instant access
5. **Server-side 7-day filter** ensures fresh, relevant content

## Deployment
- **Docker-first** - Primary deployment method
- **Environment defaults** - No configuration required
- **GitHub Container Registry** - Automated multi-arch builds
- **Port 3000** - Standard Node.js convention

## Filter Logic (Per Day)
- **All** - Complete 7-day dataset sorted chronologically
- **Homepage** - All stories sorted chronologically (newest first)
- **Story numbering** - Restarts 1-N for each day
- **Top 10/20** - Highest-scoring N stories per day, time-sorted within day
- **Top 50%** - Top half of stories per day by score

## Implementation Stack
- **Docker** - Multi-platform containerization
- **EJS templates** - Server-side rendering, no client frameworks
- **GitHub Actions** - Automated CI/CD pipeline
- **Hacker News API** - Real-time data from `topstories.json`
- **Node.js + Express** - Minimal web server (single file)
- **Tailwind CSS** - Utility-first styling, no custom CSS

## Performance Features
- **API-friendly** - Rate limiting and timeout handling
- **Batch processing** - 20 stories/batch with 100ms delays
- **Client-side filtering** - Zero latency filter switching
- **Memory efficiency** - Only caches active content

## Story Types
- **Comment threads** - Collapsible, 12px indentation levels
- **External links** - Title → URL, hostname displayed
- **Text posts** (Ask HN, Show HN) - Title → comments page
