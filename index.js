
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const axios = require('axios');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const app = express();

const consumer_key = process.env.TWITTER_API_KEY;
const consumer_secret = process.env.TWITTER_API_SECRET;
const callback_url = "https://overtaken-by-princess.onrender.com/callback";

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
  console.log("🧠 SESSION on callback:", req.session);
  const token_secret = req.session.oauth_token_secret;

  const request_data = {
    url: "https://api.twitter.com/oauth/access_token",
    method: "POST",
    data: { oauth_token, oauth_verifier }
  };

  try {
    const response = await axios.post("https://api.twitter.com/oauth/access_token", null, {
      headers: oauth.toHeader(oauth.authorize(request_data, { key: oauth_token, secret: token_secret })),
      params: { oauth_verifier }
    });

    const access = new URLSearchParams(response.data);
    const token = access.get("oauth_token");
    const secret = access.get("oauth_token_secret");

    const profileUpdate = {
      name: "Melanies ClickSlxt",
      description: "Sick patient to @melanierose2dfd 😵‍💫😵‍💫 || Addicted to dopamine and making terrible financial decisions 😷🥴💉 || Currently in deep debt to Princess Melanie 💖"
    };

    const params = new URLSearchParams(profileUpdate);

    await axios.post("https://api.twitter.com/1.1/account/update_profile.json", params.toString(), {
      headers: {
        ...oauth.toHeader(oauth.authorize({
          url: "https://api.twitter.com/1.1/account/update_profile.json",
          method: "POST",
          data: profileUpdate
        }, { key: token, secret })),
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

    res.send("<h1>Profile updated successfully! 💖</h1>");
  } catch (err) {
    console.error("Callback error:", err.response?.data || err.message);
    res.status(500).send("Callback failed");
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Princess OAuth1 server running on port ${port}`);
});
