const mongoose = require("mongoose");
const cachegoose = require("cachegoose");

mongoose.Promise = global.Promise;


function initConnection() {
  const url =
    "mongodb://" +
    process.env.DB_USER +
    ":" +
    process.env.DB_PASSWORD +
    "@" +
    process.env.DB_HOST +
    ":" +
    process.env.DB_PORT +
    "/" +
    process.env.DB_NAME;

  mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
  mongoose.connection.once("open", () => {
    console.log("Connected to MongoDB at " + process.env.DB_HOST);
  });

  cachegoose(mongoose);
}

module.exports = {
  initConnection
};
