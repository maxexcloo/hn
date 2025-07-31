const express = require('express');
const helmet = require('helmet');
const https = require('https');

const app = express();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const cache = new Map();
const MAX_CACHE_SIZE = 1000; // Prevent memory leaks
const port = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  }
}));

app.set('view engine', 'ejs');
app.use(express.static('public'));

// Helper function to fetch story data with timeout and error handling
const fetchStory = (id) => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout fetching story ${id}`));
    }, 5000); // 5 second timeout per story
    
    https.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, (itemRes) => {
      clearTimeout(timeout);
      let itemData = '';
      itemRes.on('data', (chunk) => {
        itemData += chunk;
      });
      itemRes.on('end', () => {
        try {
          resolve(JSON.parse(itemData));
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
};



// Function to fetch stories with better error handling
const fetchAllStories = async () => {
  const cacheKey = 'all-stories';
  const cached = cache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log('Cache hit for all stories');
    return cached.data;
  }
  
  console.log('Fetching fresh stories data');
  
  try {
    // Fetch from topstories to get vote-ranked stories
    const storyIds = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 10000); // 10 second timeout
      
      https.get('https://hacker-news.firebaseio.com/v0/topstories.json', (apiRes) => {
        clearTimeout(timeout);
        let data = '';
        apiRes.on('data', (chunk) => {
          data += chunk;
        });
        apiRes.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(error);
          }
        });
      }).on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
    
    // Take many more stories to ensure we have enough for complete days
    const topStoryIds = storyIds.slice(0, 1000);
    
    // Fetch stories in smaller batches to avoid overwhelming the API
    const batchSize = 20;
    const stories = [];
    
    for (let i = 0; i < topStoryIds.length; i += batchSize) {
      const batch = topStoryIds.slice(i, i + batchSize);
      const batchPromises = batch.map(id => 
        fetchStory(id).catch(err => {
          console.warn(`Failed to fetch story ${id}:`, err.message);
          return null;
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      stories.push(...batchResults);
      
      // Small delay between batches to be nice to the API
      if (i + batchSize < topStoryIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Filter out null/undefined stories
    const validStories = stories
      .filter(story => story && story.title);
    
    console.log(`Fetched ${validStories.length} valid stories`);
    
    // Cache with size limit
    if (cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }
    cache.set(cacheKey, {
      data: validStories,
      timestamp: Date.now()
    });
    
    return validStories;
    
  } catch (error) {
    console.error('Error fetching stories:', error);
    
    // Return cached data if available, even if expired
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log('Returning stale cached data due to error');
      return cached.data;
    }
    
    // Return empty array as fallback
    return [];
  }
};

app.get('/', async (req, res) => {
  try {
    const allStories = await fetchAllStories();
    
    // Filter to last 7 days but ensure we have enough stories
    const sevenDaysAgo = Date.now() / 1000 - (7 * 24 * 60 * 60);
    const recentStories = allStories.filter(story => story.time > sevenDaysAgo);
    
    console.log(`Serving ${recentStories.length} stories from last 7 days`);
    
    res.render('index', { 
      allStories: JSON.stringify(recentStories),
      currentFilter: req.query.filter || 'top-20'
    });
  } catch (error) {
    console.error('Error in route handler:', error);
    res.render('index', { 
      allStories: JSON.stringify([]),
      currentFilter: req.query.filter || 'top-20'
    });
  }
});

// Fetch comments with caching
const fetchCommentsForStory = async (storyId) => {
  const cacheKey = `comments-${storyId}`;
  const cached = cache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log(`Cache hit for comments ${storyId}`);
    return cached.data;
  }
  
  console.log(`Fetching fresh comments for story ${storyId}`);
  
  try {
    // Fetch story data
    const story = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
      
      https.get(`https://hacker-news.firebaseio.com/v0/item/${storyId}.json`, (apiRes) => {
        clearTimeout(timeout);
        let data = '';
        apiRes.on('data', (chunk) => data += chunk);
        apiRes.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(error);
          }
        });
      }).on('error', reject);
    });
    
    if (!story.kids || story.kids.length === 0) {
      const result = { story, comments: [] };
      cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    }

    // Fetch comments recursively
    const fetchCommentRecursively = async (commentId) => {
      try {
        const comment = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
          
          https.get(`https://hacker-news.firebaseio.com/v0/item/${commentId}.json`, (itemRes) => {
            clearTimeout(timeout);
            let itemData = '';
            itemRes.on('data', (chunk) => itemData += chunk);
            itemRes.on('end', () => {
              try {
                resolve(JSON.parse(itemData));
              } catch (error) {
                reject(error);
              }
            });
          }).on('error', reject);
        });
        
        if (comment && comment.kids && comment.kids.length > 0) {
          const childPromises = comment.kids.map(fetchCommentRecursively);
          comment.children = await Promise.all(childPromises);
        } else {
          comment.children = [];
        }
        
        return comment;
      } catch (error) {
        console.warn(`Failed to fetch comment ${commentId}:`, error.message);
        return null;
      }
    };

    const commentPromises = story.kids.map(fetchCommentRecursively);
    const comments = (await Promise.all(commentPromises)).filter(c => c !== null);
    
    const result = { story, comments };
    // Cache with size limit
    if (cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }
    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
    
  } catch (error) {
    console.error(`Error fetching comments for story ${storyId}:`, error);
    // Return cached data if available
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log('Returning stale cached comments due to error');
      return cached.data;
    }
    throw error;
  }
};

// Input validation helper
const isValidId = (id) => /^\d+$/.test(id) && parseInt(id) > 0;

app.get('/comments/:id', async (req, res) => {
  const storyId = req.params.id;
  
  // Validate story ID
  if (!isValidId(storyId)) {
    return res.status(400).render('error', { 
      error: 'Invalid story ID',
      message: 'The requested story could not be found.'
    });
  }
  
  try {
    const { story, comments } = await fetchCommentsForStory(storyId);
    if (!story) {
      return res.status(404).render('error', {
        error: 'Story not found',
        message: 'The requested story could not be found.'
      });
    }
    res.render('comments', { story, comments });
  } catch (error) {
    console.error('Error in comments route:', error);
    res.status(500).render('error', {
      error: 'Server Error',
      message: 'Unable to load comments. Please try again later.'
    });
  }
});


// Health check endpoints
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/ready', (req, res) => {
  res.status(200).json({ 
    status: 'ready', 
    cache: { size: cache.size, maxSize: MAX_CACHE_SIZE },
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    error: 'Page Not Found',
    message: 'The page you are looking for does not exist.'
  });
});

// Cache status endpoint (for debugging)
app.get('/cache-status', (req, res) => {
  const status = {
    size: cache.size,
    entries: []
  };
  
  for (const [key, value] of cache.entries()) {
    const age = Date.now() - value.timestamp;
    const expiry = CACHE_DURATION - age;
    status.entries.push({
      key,
      age: Math.round(age / 1000) + 's',
      expiresIn: Math.round(expiry / 1000) + 's',
      expired: expiry <= 0
    });
  }
  
  res.json(status);
});

// Pre-cache popular comments for better performance
const preCachePopularComments = async () => {
  try {
    const allStories = await fetchAllStories();
    
    // Get stories from last 3 days
    const threeDaysAgo = Date.now() / 1000 - (3 * 24 * 60 * 60);
    const recentStories = allStories
      .filter(story => story.time > threeDaysAgo)
      .sort((a, b) => b.score - a.score) // Sort by score
      .slice(0, 20); // Top 20
    
    console.log(`Pre-caching comments for ${recentStories.length} popular stories...`);
    
    // Pre-cache comments for these stories
    for (const story of recentStories) {
      try {
        await fetchCommentsForStory(story.id);
        // Small delay to be nice to the API
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.warn(`Failed to pre-cache comments for story ${story.id}:`, error.message);
      }
    }
    
    console.log('Pre-caching completed');
  } catch (error) {
    console.error('Error during pre-caching:', error.message);
  }
};

// Periodic cache refresh with better error handling
const startCacheRefresh = () => {
  setInterval(async () => {
    console.log('Refreshing stories cache...');
    try {
      await fetchAllStories(); // This will refresh the cache
      console.log('Stories cache refreshed successfully');
      
      // Also pre-cache popular comments
      await preCachePopularComments();
    } catch (error) {
      console.error('Error refreshing cache (will retry in 5 minutes):', error.message);
      // Don't crash, just log and continue
    }
  }, CACHE_DURATION); // Refresh every 5 minutes
};

const server = app.listen(port, async () => {
  console.log(`Server listening on port ${port}`);
  
  // Start periodic cache refresh
  startCacheRefresh();
  
  // Warm cache on startup with error handling
  setTimeout(async () => {
    try {
      await fetchAllStories();
      console.log('Initial cache warming completed');
      
      // Pre-cache popular comments
      await preCachePopularComments();
    } catch (error) {
      console.error('Initial cache warming failed (will retry automatically):', error.message);
    }
  }, 1000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});
