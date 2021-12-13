const needle = require('needle');
const { Sequelize } = require('sequelize');
const { Tweet, Queue } = require('./db/models')
const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
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

async function getUserByUsername(username) {
    const endpoint = "https://api.twitter.com/2/users/by?usernames="

    const params = {
        usernames: String(process.env.TARGET_USER)
    }

    const res = await needle('get', endpoint, params, {
        headers: {
            "authorization": `Bearer ${process.env.API_TOKEN}`
        }
    })

    if (res.body) {
        return res.body.data[0]['id'];
    } else {
        throw new Error('Request unsuccessful')
    }
}

async function getTweetsByUser(user_id) {
    let user_tweets = [];
    const endpoint = `https://api.twitter.com/2/users/${user_id}/tweets`;

    const params = {
        "exclude": "retweets",
        "tweet.fields": "id,created_at,text"
    };

    const options = {
        "headers": {
            "authorization": `Bearer ${process.env.API_TOKEN}`
        }
    }

    let has_next_page = true;
    let next_token = null;

    while (has_next_page) {
        let response = await getTweetsPage(params, options, next_token, endpoint);
        if (response && response.meta && response.meta.result_count && response.meta.result_count > 0) {
            if (response.data) {
                user_tweets.push.apply(user_tweets, response.data);
            }
            if (response.meta.next_token) {
                next_token = response.meta.next_token;
                has_next_page = false;
            } else {
                has_next_page = false;
            }
        } else {
            has_next_page = false;
        }
    }

    return user_tweets;
}

const getTweetsPage = async (params, options, next_token, endpoint) => {
    if (next_token) {
        params.pagination_token = next_token;
    }

    try {
        const response = await needle('get', endpoint, params, options);

        if (response.statusCode != 200) {
            return;
        }
        return response.body;
    } catch (err) {
        throw new Error(`Request failed: ${err}`);
    }
}

const loadArchivedTweetIds = async () => {
    const re_id = /[^status\/]\d*$/;
    const urls = fs.readFileSync('./data/data.txt').toString('utf-8').split('\n');
    return urls.map(url => {
        if (url.match(re_id)) {
            return url.match(re_id)[0];
        }
    });
}

const fetchTweetsBulk = async (page) => {
    const endpoint = "https://api.twitter.com/2/tweets"

    const params = {
        "ids": page,
        "tweet.fields": "id,created_at,text"
    }

    const res = await needle('get', endpoint, params, {
        headers: {
            "authorization": `Bearer ${process.env.API_TOKEN}`
        }
    })

    if (res.body) {
        return res.body.data;
    } else {
        throw new Error('Request unsuccessful')
    }
}

const getArchivedTweets = async (urls) => {
    const pages = parseInt(urls.length / 100);
    let responses = [];
    let page = null;

    for (let i = 0; i < pages + 1; i++) {
        if ( i < pages ) {
            page = urls.slice(i * 100, (i * 100) + 100).join(',');
        } else {
            page = urls.slice(i * 100, urls.length - 1).join(',');
        }
        responses.push(await fetchTweetsBulk(page));
    }

    return responses.flat();
}

const writeJsonFile = async (tweets) => {
    fs.writeFileSync('./data/tweets.json', JSON.stringify(tweets), 'utf-8');
}

const readJsonFile = async() => {
    return JSON.parse(fs.readFileSync('./data/tweets.json', 'utf-8'));
}

async function cleanTweetText(tweets) {
    const re_username = /([@][\w]*)/g;
    const re_url = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;

    return tweets.map((tweet) => {
        tweet.text = tweet.text.replaceAll(re_username,'')
        tweet.text = tweet.text.replaceAll(re_url,'')
        return tweet;
    });
}

const addTweetsToDatabaseBulk = async (tweets, db) => {
    const formatted_tweets = await cleanTweetText(tweets);
    const records = [];
    formatted_tweets.forEach((tweet) => {
        records.push({
            tweetID: tweet.id,
            text: tweet.text,
            tweetedAt: tweet.created_at
        })
    })
    await Tweet.bulkCreate(records)
}

const generateTrainingData = async (db, type) => {
    const tweets = await Tweet.findAll();
    let data = [];

    tweets.forEach((tweet) => {
        data.push({"prompt": "", "completion": tweet.text})
    })

    if (type === 'json') {
        fs.writeFileSync('./data/training_data.json', JSON.stringify(data), 'utf-8');
    } else if (type === 'csv') {
        const csvWriter = await createCsvWriter({
            path: 'data/training_data.csv',
            header: [
              {id: 'prompt', title: 'prompt'},
              {id: 'completion', title: 'completion'}
            ]
        });

        await csvWriter.writeRecords(data);
    }
}

const loadTweetsIntoQueue = async (db) => {
    const queue_tweets = fs.readFileSync(process.env.QUEUE).toString('utf-8').split('\n');
    const records = [];
    queue_tweets.forEach((tweet) => {
        records.push({
            text: tweet
        })
    })
    await Queue.bulkCreate(records)
}

(async () => {
    let tweets, db;

    try {
        db = await connectToDatabase();
        await loadTweetsIntoQueue(db);
    } catch (err) {
        console.log(err);
        process.exit(-1);
    }

    process.exit();
})();