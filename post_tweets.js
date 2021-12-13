const { TwitterApi } = require('twitter-api-v2');
const { Sequelize } = require('sequelize');
const { Queue } = require('./db/models')
require('dotenv').config();

async function connectToDatabase() {
    const db = new Sequelize(process.env.MYSQL_DATABASE, process.env.MYSQL_USER, process.env.MYSQL_PASSWORD, {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'mariadb'
    })
    console.log('Connecting to database...');
    try {
        await db.authenticate();
        console.log('Connected!');
        return db;
    } catch (err) {
        console.log(err);
    }
}

const client = new TwitterApi({
    appKey: process.env.API_KEY,
    appSecret: process.env.API_SECRET,
    accessToken: process.env.TEST_TOKEN,
    accessSecret: process.env.TEST_SECRET
})

const Twitter = client.readWrite;

const getNextTweet = async () => {
    const tweets = await Queue.findAll();
    for (const tweet of tweets) {
        if (tweet.posted) {
            continue;
        } else {
            return {'text': tweet.text, 'id': tweet.id};
        }
    }
}

const postTweet = async (message) => {
    return await Twitter.v2.tweet(message);
}

(async () => {
    let response, db, tweet;

    try {
        db = await connectToDatabase();
        tweet = await getNextTweet();
        console.log(tweet);
        response = await postTweet(tweet['text']);
        if (response.data.id) {
            let record = await Queue.findByPk(tweet['id']);
            record.posted = true;
            await record.save();
        }
    } catch (err) {
        console.error(err);
    }

    process.exit();
})();