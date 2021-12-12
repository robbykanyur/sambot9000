const needle = require('needle');
const { Sequelize } = require('sequelize')
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

async function getTweetsByUser(user_id) {
    let user_tweets = [];
    let processed_tweets = [];
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
    let contains_username = null;
    const re_username = /([@][\w]*)/g;
    const re_url = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    console.log('Retrieving tweets...');

    while (has_next_page) {
        let response = await getTweetsPage(params, options, next_token, endpoint);
        if (response && response.meta && response.meta.result_count && response.meta.result_count > 0) {
            if (response.data) {
                user_tweets.push.apply(user_tweets, response.data);
                processed_tweets.push(user_tweets.map((tweet) => {
                    tweet.text = tweet.text.replaceAll(re_username,'')
                    tweet.text = tweet.text.replaceAll(re_url,'')
                    return tweet;
                }));
            }
            if (response.meta.next_token) {
                next_token = response.meta.next_token;
                // only get one page for now
                has_next_page = false;
            } else {
                has_next_page = false;
            }
        } else {
            has_next_page = false;
        }
    }

    console.log(processed_tweets);
    return processed_tweets;
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

(async () => {
    let user_id = null;
    let tweets = null;
    let db = null;

    try {
        db = await connectToDatabase();
    } catch (err) {
        console.log(err);
        process.exit(-1);
    }

    try {
        user_id = await getUserByUsername();
    } catch (err) {
        console.log(err);
        process.exit(-1);
    }

    try {
        tweets = await getTweetsByUser(user_id);
    } catch (err) {
        console.log(err);
        process.exit(-1);
    }

    process.exit();
})();