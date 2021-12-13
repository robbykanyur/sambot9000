const { TwitterApi } = require('twitter-api-v2');
require('dotenv').config();

const client = new TwitterApi({
    appKey: process.env.API_KEY,
    appSecret: process.env.API_SECRET,
    accessToken: process.env.ACCESS_TOKEN,
    accessSecret: process.env.ACCESS_SECRET
})

const Twitter = client.readWrite;

const postTweet = async (message) => {
    return await Twitter.v2.tweet(message);
}

(async () => {
    let response;

    try {
        response = await postTweet("i'm back, babies");
    } catch (err) {
        console.error(err);
    }

    console.log(response);
    process.exit();
})();