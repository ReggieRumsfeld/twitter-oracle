require("dotenv").config();
const axios = require("axios").default;

const tweets = ["1480180694907293698"];

async function main(tweetIDs) {
    return await axios.get(
      //`https://api.twitter.com/2/tweets?ids=${tweets}&tweet.fields=public_metrics,author_id,conversation_id&expansions=attachments.media_keys&media.fields=public_metrics`,
      `https://api.twitter.com/2/tweets?ids=${tweetIDs}&tweet.fields=public_metrics,author_id,conversation_id`,
      {
        headers: {
          Authorization: `bearer ${process.env.BEARER_TOKEN}`,
        },
      }
    );
}

main(tweets)
    .then((result) => {
        console.log(result.data.data)
        process.exit(0)
    })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
