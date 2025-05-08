
const express = require('express');
const session = require('express-session');
const axios = require('axios');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const app = express();

const consumer_key = process.env.TWITTER_API_KEY;
const consumer_secret = process.env.TWITTER_API_SECRET;
const callback_url = "https://overtaken-by-princess.onrender.com/callback";

app.use(session({ secret: 'princess', resave: false, saveUninitialized: true }));

const oauth = OAuth({
  consumer: { key: consumer_key, secret: consumer_secret },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
  }
});

async function fetchAndIncrementCounter() {
  const rawUrl = "https://github.com/Stevetest1234/overtaken-by-princess/blob/main/takeover_count.txt";
  const githubToken = process.env.GITHUB_TOKEN;
  const repo = "Stevetest1234/overtaken-by-princess";
  const filePath = "counter.txt";

  const { data: rawCounter } = await axios.get(rawUrl);
  const current = parseInt(rawCounter.trim()) || 0;
  const updated = current + 1;

  const { data: fileMeta } = await axios.get(
    `https://api.github.com/repos/${repo}/contents/${filePath}`,
    { headers: { Authorization: `Bearer ${githubToken}`, Accept: "application/vnd.github.v3+json" } }
  );

  await axios.put(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
    message: `Auto-increment counter to ${updated}`,
    content: Buffer.from(String(updated)).toString("base64"),
    sha: fileMeta.sha
  }, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github.v3+json"
    }
  });

  return updated;
}

function requestToken() {
  const url = "https://api.twitter.com/oauth/request_token";
  const request_data = { url, method: "POST", data: { oauth_callback: callback_url } };
  return axios.post(url, null, { headers: oauth.toHeader(oauth.authorize(request_data)) });
}

app.get('/login', async (req, res) => {
  try {
    const response = await requestToken();
    const params = new URLSearchParams(response.data);
    req.session.oauth_token = params.get("oauth_token");
    req.session.oauth_token_secret = params.get("oauth_token_secret");
    res.redirect(`https://api.twitter.com/oauth/authorize?oauth_token=${params.get("oauth_token")}`);
  } catch (err) {
    console.error("Error getting request token:", err.response?.data || err.message);
    res.status(500).send("OAuth request failed");
  }
});

app.get('/callback', async (req, res) => {
  const { oauth_token, oauth_verifier } = req.query;
  const token_secret = req.session.oauth_token_secret;
  const url = "https://api.twitter.com/oauth/access_token";
  const request_data = {
    url,
    method: "POST",
    data: { oauth_token, oauth_verifier }
  };

  try {
    const response = await axios.post(url, null, {
      headers: oauth.toHeader(oauth.authorize(request_data, { key: oauth_token, secret: token_secret })),
      params: { oauth_verifier }
    });

    const access = new URLSearchParams(response.data);
    const token = access.get("oauth_token");
    const secret = access.get("oauth_token_secret");

    const count = await fetchAndIncrementCounter();

    const displayName = `Melanies Clickslxt ${count}`;

    const bioUpdate = {
      url: "https://api.twitter.com/1.1/account/update_profile.json",
      method: "POST",
      data: {
        description: "Sick patient to @melanierose2dfd 😵‍💫😵‍💫 || Addicted to dopamine and making terrible financial decisions 😷🥴💉 || Currently in deep debt to Princess Melanie💖",
        name: `Melanies Clickslxt ${count}`
      }
    };

    const body = new URLSearchParams(bioUpdate.data);

    await axios.post(bioUpdate.url, null, {
      headers: oauth.toHeader(oauth.authorize(bioUpdate, { key: token, secret })),
      params: bioUpdate.data
    });

    const html = `
    <html>
    <head>
      <title>Clickslut Activated 💖</title>
      <style>
        body {
          background-color: #ffe6f9;
          font-family: 'Comic Sans MS', cursive, sans-serif;
          color: #d63384;
          text-align: center;
          padding: 2rem;
          background-image: url('https://www.transparenttextures.com/patterns/shine-car.png');
        }
        h1 { font-size: 2.5rem; text-shadow: 1px 1px 2px #ffb3d9; }
        .image-preview {
          margin: 20px 0;
          border-radius: 12px;
          box-shadow: 0 0 20px pink;
        }
        .button {
          background-color: #ff66b3;
          color: white;
          padding: 12px 20px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1.1rem;
          margin: 10px;
        }
        .button:hover { background-color: #ff3399; }
      </style>
    </head>
    <body>
      <h1>👑 Rejoice Commoner 👑</h1>
      <p>You have been <strong>totally branded</strong> by Princess Melanie.</p>
      <h2>🎀 Melanie's New Name for You</h2>
      <h3>${displayName}</h3>
      <h2>🎀 Your New PFP</h2>
      <img class="image-preview" src="https://raw.githubusercontent.com/Stevetest1234/overtaken-by-princess/main/pfp.png" alt="PFP" width="200" height="200">
      <br>
      <a class="button" href="https://raw.githubusercontent.com/Stevetest1234/overtaken-by-princess/main/pfp.png" target="_blank">Open PFP Image</a>
      <h2>🎀 Your New Banner</h2>
      <img class="image-preview" src="https://raw.githubusercontent.com/Stevetest1234/overtaken-by-princess/main/banner.png" alt="Banner" width="500">
      <br>
      <a class="button" href="https://raw.githubusercontent.com/Stevetest1234/overtaken-by-princess/main/banner.png" target="_blank">Open Banner Image</a>
    </body>
    </html>`;
    res.send(html);
  } catch (err) {
    console.error("Callback error:", err.response?.data || err.message);
    res.status(500).send("Callback failed");
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Princess OAuth1 server running on port ${port}`);
});
