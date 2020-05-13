const express = require("express");
const WebSocketServer = require("websocket").server;
const cron = require("node-cron");
const { ApolloServer } = require("apollo-server-express");
const { createModel } = require("mongoose-gridfs");

const handleWebsocketRequests = require("./services/websocketService");
const typeDefs = require("./graphql/schema");
const resolvers = require("./graphql/resolvers");
const authentication = require("./graphql/authentication");

if (process.env.NODE_ENV !== "production") {
  console.log("Loading env vars from .env");
  require("dotenv").config();
}

const { initConnection } = require("./db/dbUtils");

const buffer = require("./simulation/buffers");



initConnection()

const PORT = process.env.PORT || 4000;

const app = express();
const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  context: authentication.generateRoleContext,
});

apolloServer.applyMiddleware({ app });

const server = app.listen({ port: PORT }, () =>
  console.log(
    `🚀 Server ready at http://localhost:${PORT}${apolloServer.graphqlPath}`
  )
);

const websocketServer = new WebSocketServer({
  httpServer: server,
  autoAcceptConnections: false,
});

handleWebsocketRequests(websocketServer);

app.get("/pictures", (req, res) => {

  const id = req.query.id;
  const Attachment = createModel();
  Attachment.findById(id, (error, attachment) => {
    if(error || !attachment){
      res.status(404).send("Picture not found");
      return;
    }
    const readstream = attachment.read();
    readstream.pipe(res);
  });
});


cron.schedule("1,15,30,45 * * * * *", function () {
  buffer.updateBuffers(240);
});