# sambot9000

a GPT-3 twitter bot

---

env file

    API_KEY= twitter API key
    API_SECRET= twitter API secret
    API_TOKEN= twitter API token
    ACCESS_TOKEN= access token for the account you're posting to
    ACCESS_SECRET= secret token for the account you're posting to
    TARGET_USER= user that you're scraping tweets from
    DB_PORT= database port
    DB_HOST= database host
    MYSQL_DATABASE= database name
    MYSQL_USER= database username
    MYSQL_PASSWORD= database password
    MYSQL_ROOT_PASSWORD= database root password (for docker)
    OPENAI_KEY= OpenAI secret key (for generating tweets)
    MODEL_01= ID for the first trained model (4 epochs)
    MODEL_02= ID for the second trained model (3 epochs, generally the best tweets)
    MODEL_03= ID for the third trained model (2 epochs, generally under-trained)
    QUEUE= relative path to the curated tweets ready to load into the queue
