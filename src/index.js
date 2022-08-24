require("dotenv").config({ path: `.env.local` });
const { httpsOverHttp } = require("tunnel");
const { decode } = require("html-entities");
const tunnel = httpsOverHttp({
  proxy: {
    host: "localhost",
    port: 10081,
  },
});
const _axios = require("axios").default;
let isFirstRun = true;

const axios = _axios.create({
  httpsAgent: tunnel,
  proxy: false,
});

const data = require("../data/data.json");
const phrases = require("../data/phrases.json");

const THREADS_UPDATE_INTERVAL_SECONDS = 60 * 3;
const POST_INTERVAL_SECONDS = 10 * 2;

let threadNumbers = [];
let _pages;

const updateThreadNumbers = async () => {
  if (!process.env.CATALOG_URL) {
    return;
  }
  console.log("[autoposter] get pages...");
  const response = await axios.get(process.env.CATALOG_URL);
  console.log("[autoposter] got pages. reading them.");
  const pages = response.data;
  console.log("[autoposter] got " + pages.length + " pages");
  _pages = pages;
  threadNumbers = pages
    .map((page) => page.threads)
    .reduce((arr1, arr2) => [...arr1, ...arr2], [])
    .map((thread) => thread.no);
  threadNumbers = threadNumbers.slice(0, threadNumbers.length - 8);
  if (isFirstRun) {
    isFirstRun = false;
    postPhrase();
  }
};

const postPhrase = async () => {
  console.info("[autoposter] starting to post a phrase...");
  if (threadNumbers.length === 0) {
    return;
  }
  if (!process.env.POST_URL) {
    return;
  }
  const phrase = phrases[Math.floor(Math.random() * phrases.length)].split("");
  let antiSpamFilteredPhrase = "";
  for (let i = 0; i < phrase.length; ++i) {
    antiSpamFilteredPhrase += phrase[i].repeat(
      Math.floor(Math.random() * 2) + 1
    );

    if (typeof phrase[i + 1] !== "undefined" && phrase[i + 1] != " ") {
      if (Math.random() > 0.8) {
        antiSpamFilteredPhrase += Math.random() > 0.5 ? "," : ".";
      }
    }

    if (Math.random() > 0.8) {
      antiSpamFilteredPhrase += " ";
    }
  }
  if (Math.random() > 0.5) {
    antiSpamFilteredPhrase += ".";
  }
  if (Math.random() > 0.5) {
    antiSpamFilteredPhrase =
      antiSpamFilteredPhrase[0].toUpperCase() + antiSpamFilteredPhrase.slice(1);
  }
  console.info(
    '[autoposter] posting phrase "' + antiSpamFilteredPhrase + '"...'
  );
  if (!process.env.USER_AGENT) {
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
      comment: antiSpamFilteredPhrase,
      email: Math.random() > 0.2 ? "sage" : "",
      file: {},
      spoiler: false,
      ghost: false,
    },
    features: {
      tries: "",
      newHash: false,
      filterBypass: 0,
      spoilerSprinkler: "",
      useCookie: false,
    },
  };
  _axios.post(process.env.POST_URL, postData);
  console.info(
    "[autoposter] request posting phrase " +
      antiSpamFilteredPhrase +
      " in thread " +
      threadNumber
  );
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
      email: "sage",
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
    postPhrase();
  } catch (error) {
    console.error("[autoposter] " + error);
  }
}, 1000 * POST_INTERVAL_SECONDS);
updateThreadNumbers();
