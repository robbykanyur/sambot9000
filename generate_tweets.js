const needle = require('needle');
const fs = require('fs');
require('dotenv').config();

const queryApi = async () => {
    const endpoint = "https://api.openai.com/v1/completions"
    const prompts = fs.readFileSync('./data/prompts/prompts_211212.txt', 'utf-8').split('\n');
    let tweets = []

    const pages = prompts.length / 20;

    for (let i = 0; i < pages; i++) {
        const batch = prompts.slice(i * 20, (i * 20) + 20)

        let params = {        
            'prompt': batch,
            'temperature': 0.9,
            'n': 10,
            'max_tokens': 32,
            'echo': true,
            'model': process.env.MODEL_03
        }
        
        const res = await needle('post', endpoint, params, {
            headers: {
                "Content-Type": 'application/json',
                "Authorization": `Bearer ${process.env.OPENAI_KEY}`
            }
        })
    
        if (res.body['choices']) {
            res.body['choices'].forEach((tweet) => {
                tweets.push(tweet['text'])
            })
        } else {
            console.log(res.body);
            throw new Error('Request unsuccessful')
        }
    }

    return tweets
}

const generateOutput = async (tweets) => {
    output = tweets.join('\n\n')
    fs.writeFileSync(`./data/output/tweets_${Date.now()}.txt`, output, 'utf-8');
}

(async () => {
    let tweets;

    try {
        tweets = await queryApi();
        await generateOutput(tweets);
    } catch (err) {
        console.log(err);
        process.exit(-1);
    }

    process.exit();
})();