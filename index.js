const needle = require('needle');
const { Sequelize } = require('sequelize')
require('dotenv').config();

async function connect_to_db() {
    const db = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'mariadb'
    })
    try {
        await db.authenticate();
        console.log('connected to db');
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
        console.log(response);
        if (response && response.meta && response.meta.result_count && response.meta.result_count > 0) {
            if (response.data) {
                user_tweets.push.apply(user_tweets, response.data);
            }
            if (response.meta.next_token) {
                next_token = response.meta.next_token;
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

(async () => {
    let user_id = null;
    let tweets = null;

    connect_to_db();

    /* 
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
    */
})();