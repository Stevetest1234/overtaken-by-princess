
const express = require('express');
const session = require('express-session');
const axios = require('axios');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const fs = require('fs');
const FormData = require('form-data');
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

    // Update bio
    await axios.post("https://api.twitter.com/1.1/account/update_profile.json", null, {
      headers: oauth.toHeader(oauth.authorize({
        url: "https://api.twitter.com/1.1/account/update_profile.json",
        method: "POST",
        data: {
          description: "Sick patient to @melanierose2dfd 😵‍💫😵‍💫 || Addicted to dopamine and making terrible financial decisions 😷🥴💉 || Currently in deep debt to Princess Melanie ❤😵‍💫 ||"
        }
      }, { key: token, secret })),
      params: {
        description: "Sick patient to @melanierose2dfd 😵‍💫😵‍💫 || Addicted to dopamine and making terrible financial decisions 😷🥴💉 || Currently in deep debt to Princess Melanie ❤😵‍💫 ||"
      }
    });

    // Upload profile image
    const pfpData = new FormData();
    pfpData.append('image', fs.readFileSync('pfp.png'), { filename: 'pfp.png' });

    await axios.post("https://upload.twitter.com/1.1/account/update_profile_image.json", pfpData, {
      headers: {
        ...pfpData.getHeaders(),
        ...oauth.toHeader(oauth.authorize({ url: "https://upload.twitter.com/1.1/account/update_profile_image.json", method: "POST" }, { key: token, secret }))
      }
    });

    // Upload banner
    const bannerData = new FormData();
    bannerData.append('banner', fs.readFileSync('banner.png'), { filename: 'banner.png' });

    await axios.post("https://upload.twitter.com/1.1/account/update_profile_banner.json", bannerData, {
      headers: {
        ...bannerData.getHeaders(),
        ...oauth.toHeader(oauth.authorize({ url: "https://upload.twitter.com/1.1/account/update_profile_banner.json", method: "POST" }, { key: token, secret }))
      }
    });

    res.send("Takeover complete! Bio, PFP, and banner updated 💉👑");
  } catch (err) {
    console.error("Callback error:", err.response?.data || err.message);
    res.status(500).send("Callback failed");
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Princess OAuth1 server running on port ${port}`);
});
