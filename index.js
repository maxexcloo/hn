const express = require('express');
const https = require('https');
const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', (req, res) => {
  const hnUrl = 'https://hacker-news.firebaseio.com/v0/topstories.json';

  https.get(hnUrl, (apiRes) => {
    let data = '';
    apiRes.on('data', (chunk) => {
      data += chunk;
    });
    apiRes.on('end', () => {
      const storyIds = JSON.parse(data).slice(0, 30);
      const storyPromises = storyIds.map(id =>
        new Promise((resolve, reject) => {
          https.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, (itemRes) => {
            let itemData = '';
            itemRes.on('data', (chunk) => {
              itemData += chunk;
            });
            itemRes.on('end', () => {
              resolve(JSON.parse(itemData));
            });
          }).on('error', (err) => {
            reject(err);
          });
        })
      );

      Promise.all(storyPromises)
        .then(stories => {
          res.render('index', { stories });
        })
        .catch(err => {
          res.status(500).send('Error fetching stories');
        });
    });
  }).on('error', (err) => {
    res.status(500).send('Error fetching top stories');
  });
});

app.get('/comments/:id', (req, res) => {
  const storyId = req.params.id;
  const hnUrl = `https://hacker-news.firebaseio.com/v0/item/${storyId}.json`;

  https.get(hnUrl, (apiRes) => {
    let data = '';
    apiRes.on('data', (chunk) => {
      data += chunk;
    });
    apiRes.on('end', () => {
      const story = JSON.parse(data);
      const commentPromises = story.kids.map(id =>
        new Promise((resolve, reject) => {
          https.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, (itemRes) => {
            let itemData = '';
            itemRes.on('data', (chunk) => {
              itemData += chunk;
            });
            itemRes.on('end', () => {
              resolve(JSON.parse(itemData));
            });
          }).on('error', (err) => {
            reject(err);
          });
        })
      );

      Promise.all(commentPromises)
        .then(comments => {
          res.render('comments', { story, comments });
        })
        .catch(err => {
          res.status(500).send('Error fetching comments');
        });
    });
  }).on('error', (err) => {
    res.status(500).send('Error fetching story');
  });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});