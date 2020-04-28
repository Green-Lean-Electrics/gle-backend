const express = require("express");
const WebSocketServer = require("websocket").server;
const cron = require("node-cron");
const { ApolloServer } = require("apollo-server-express");

const handleWebsocketRequests = require("./services/websocketService");
const typeDefs = require("./graphql/schema");
const resolvers = require("./graphql/resolvers");
const authentication = require("./graphql/authentication");

if (process.env.NODE_ENV !== "production") {
  console.log("Loading env vars from .env");
  require("dotenv").config();
}

require("./db/dbUtils");

const buffer = require("./simulation/buffers");

// cron.schedule("* * * * *", function () {
//   buffer.updateBuffers();
// });

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