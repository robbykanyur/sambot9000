const needle = require('needle');
const { Sequelize } = require('sequelize')
const fs = require('fs');
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
        usernames: String(process.env.USERNAME)
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

async function cleanTweetText(tweets) {
    const re_username = /([@][\w]*)/g;
    const re_url = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;

    return tweets.map((tweet) => {
        tweet.text = tweet.text.replaceAll(re_username,'')
        tweet.text = tweet.text.replaceAll(re_url,'')
        console.dir(tweet);
        return tweet;
    });
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
    console.log('Retrieving tweets...');

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
            console.log(`${response.statusCode} ${response.statusMessage}:n${response.body}`);
            return;
        }
        return response.body;
    } catch (err) {
        throw new Error(`Request failed: ${err}`);
    }
}

const addTweetsToDatabase = async (tweets, db) => {
    const Tweet = db.models.Tweet;
    console.log(db);
    for (const tweet in tweets) {
        await Tweet.create({
            id: tweet.id,
            text: tweet.text,
            tweetedAt: tweet.created_at
        });
    };
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

(async () => {
    let user_id = null;
    let tweets = null;
    let db = null;
    let archived_tweet_ids = [];
    let archived_tweets = [];

    try {
        // db = await connectToDatabase();
        // user_id = await getUserByUsername();
        archived_tweet_ids = await loadArchivedTweetIds();
        archived_tweets = await getArchivedTweets(archived_tweet_ids);
        writeJsonFile(archived_tweets);
        // console.log(archived_tweets)
        // tweets = await getTweetsByUser(user_id);
        // await addTweetsToDatabase(tweets, db);
        // const tweets = readJsonFile();
    } catch (err) {
        console.log(err);
        process.exit(-1);
    }

    process.exit();
})();