const express = require('express');
const cron = require("node-cron");

const { ApolloServer, gql } = require('apollo-server-express');
const typeDefs = require('./graphql/schema');
const resolvers = require('./graphql/resolvers')
const authentication = require('./graphql/authentication')

require('./db/dbUtils')

const buffer = require('./simulation/buffers')


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

app.listen({ port: 4000 }, () =>
  console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`)
);

