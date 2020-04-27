const express = require('express');
const cron = require("node-cron");

const { ApolloServer, gql } = require('apollo-server-express');
const typeDefs = require('./graphql/schema');
const resolvers = require('./graphql/resolvers')
const authentication = require('./graphql/authentication')

if (process.env.NODE_ENV !== 'production') {
  console.log('Loading env vars from .env')
  require('dotenv').config()
}

require('./db/dbUtils')

const buffer = require('./simulation/buffers')

const PORT = process.env.PORT || 4000;


const app = express()
const server = new ApolloServer(
  {
    typeDefs,
    resolvers,
    context: authentication.generateRoleContext
  }
);

server.applyMiddleware({ app });

cron.schedule("* * * * *", function () {
  buffer.updateBuffers()
})

app.listen({ port: PORT }, () =>
  console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`)
);

