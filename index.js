
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const axios = require('axios');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const path = require('path');
const querystring = require('querystring');
const app = express();

const consumer_key = process.env.TWITTER_API_KEY;
const consumer_secret = process.env.TWITTER_API_SECRET;
const github_token = process.env.GITHUB_TOKEN;
const repo_owner = "Stevetest1234";
const repo_name = "overtaken-by-princess";
const file_path = "takeover_count.txt";
const callback_url = "https://overtaken-by-princess.onrender.com/callback";

async function getAndIncrementCount() {
  const url = `https://api.github.com/repos/${repo_owner}/${repo_name}/contents/${file_path}`;

  const headers = {
    Authorization: `token ${github_token}`,
    Accept: "application/vnd.github.v3+json"
  };

  const res = await axios.get(url, { headers });
  const sha = res.data.sha;
  const currentContent = Buffer.from(res.data.content, 'base64').toString();
  const cleanContent = currentContent.trim().replace(/[^0-9]/g, '');
  const number = parseInt(cleanContent, 10);
  if (isNaN(number) || !Number.isInteger(number)) {
    console.error("💥 Invalid takeover count:", cleanContent);
    throw new Error("Invalid counter from GitHub: " + cleanContent);
  }
  const newNumber = number + 1;
  const encodedContent = Buffer.from(String(newNumber)).toString('base64');

  await axios.put(url, {
    message: `Princess takeover #${newNumber}`,
    content: encodedContent,
    sha: sha
  }, { headers });

  return newNumber;
}

app.set('trust proxy', 1);
app.use(session({
  store: new FileStore({}),
  secret: 'princess',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 600000 }
}));

const oauth = OAuth({
  consumer: { key: consumer_key, secret: consumer_secret },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
  }
});

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

  try {
    const accessResponse = await axios.post("https://api.twitter.com/oauth/access_token", null, {
      headers: oauth.toHeader(oauth.authorize({
        url: "https://api.twitter.com/oauth/access_token",
        method: "POST",
        data: { oauth_token, oauth_verifier }
      }, { key: oauth_token, secret: token_secret })),
      params: { oauth_verifier }
    });

    const access = new URLSearchParams(accessResponse.data);
    const token = access.get("oauth_token");
    const secret = access.get("oauth_token_secret");

    const takeoverCount = await getAndIncrementCount();
    const displayName = `Melanies ClickSlxt #${takeoverCount}`;
    console.log('📛 Final displayName:', displayName);
    
    const data = {
      name: displayName,
      description: "Serving Princess Melanie 💖"
    };

    console.log('📛 Final displayName:', data.name);

    const postBody = querystring.stringify(data);

    const headers = {
      ...oauth.toHeader(oauth.authorize({
        url: "https://api.twitter.com/1.1/account/update_profile.json",
        method: "POST",
        data
      }, { key: token, secret })),
      "Content-Type": "application/x-www-form-urlencoded"
    };

    await axios.post("https://api.twitter.com/1.1/account/update_profile.json", postBody, { headers });


    const html = `
    <html>
    <head>
      <title>Clickslut #${takeoverCount} Activated 💖</title>
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
      <h1>💖 Good clickslut 💖</h1>
      <p>Now finish being the good click slut you are and update your profile picture and banner now!<br>
         Can’t have your Princess doing everything for you, clickslut!</p>
      <h2>🎀 Your New PFP</h2>
      <img class="image-preview" src="https://stevetest1234.github.io/overtaken-by-princess/pfp.png" alt="PFP" width="200" height="200">
      <br>
      <a class="button" href="https://stevetest1234.github.io/overtaken-by-princess/pfp.png" target="_blank">Open PFP Image</a>
      <h2>🎀 Your New Banner</h2>
      <img class="image-preview" src="https://stevetest1234.github.io/overtaken-by-princess/banner.png" alt="Banner" width="500">
      <br>
      <a class="button" href="https://stevetest1234.github.io/overtaken-by-princess/banner.png" target="_blank">Open Banner Image</a>
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
  console.log(`Princess GitHub OAuth server running on port ${port}`);
});
