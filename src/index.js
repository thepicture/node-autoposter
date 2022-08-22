require("dotenv").config({ path: `.env.local` });
const { httpsOverHttp } = require("tunnel");
const tunnel = httpsOverHttp({
  proxy: {
    host: "localhost",
    port: 10081,
  },
});
const _axios = require("axios").default;

const axios = _axios.create({
  httpsAgent: tunnel,
  proxy: false,
});

const data = require("../data/data.json");

const THREADS_UPDATE_INTERVAL_SECONDS = 60;
const POST_INTERVAL_SECONDS = 60 * 2;

let threadNumbers = [];

const updateThreadNumbers = async () => {
  if (!process.env.CATALOG_URL) {
    return;
  }
  const response = await axios.get(process.env.CATALOG_URL);
  const pages = response.data;
  threadNumbers = pages
    .map((page) => page.threads)
    .reduce((arr1, arr2) => [...arr1, ...arr2], [])
    .map((thread) => thread.no);
};

const post = async () => {
  console.info("[autoposter] starting to post...");
  if (threadNumbers.length === 0) {
    return;
  }
  if (!process.env.POST_URL) {
    return;
  }
  const imageURL = data[Math.floor(Math.random() * data.length)];
  console.info("[autoposter] downloading " + imageURL + "...");
  if (!process.env.USER_AGENT) {
    return;
  }
  const response = await axios.get(imageURL, {
    responseType: "arraybuffer",
    headers: {
      "User-Agent": process.env.USER_AGENT,
    },
  });
  const buffer = response.data;
  if (!buffer) {
    console.error("[autoposter] buffer is undefined");
    return;
  }
  console.info("[autoposter] image downloaded. converting to data url...");
  let dataURL = Buffer.from(buffer, "binary").toString("base64");
  console.info("[autoposter] converted to data url. size:" + dataURL.length);

  if (!dataURL) {
    console.error("[autoposter] can't load image " + imageURL);
    return;
  }

  const threadNumber =
    threadNumbers[Math.floor(Math.random() * threadNumbers.length)];

  const postData = {
    key: null,
    board: "an",
    thread: String(threadNumber),
    post: {
      name: "",
      comment: "",
      email: "",
      file: {
        mime: "image/jpeg",
        name: +new Date() + ".jpg",
        uri: "data:image/jpeg;base64," + dataURL,
      },
      spoiler: false,
      ghost: false,
    },
    features: {
      tries: "",
      newHash: false,
      filterBypass: 0,
      spoilerSprinkler: "",
    },
  };
  _axios.post(process.env.POST_URL, postData);
  console.info(
    "[autoposter] request posting image " +
      imageURL +
      " in thread " +
      threadNumber
  );
};

setInterval(() => {
  try {
    updateThreadNumbers();
  } catch (error) {
    console.error("[autoposter] " + error);
  }
}, 1000 * THREADS_UPDATE_INTERVAL_SECONDS);
setInterval(() => {
  try {
    post();
  } catch (error) {
    console.error("[autoposter] " + error);
  }
}, 1000 * POST_INTERVAL_SECONDS);
updateThreadNumbers();
