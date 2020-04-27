const { gql } = require('apollo-server');

const typeDefs = gql`
  type Query {
    electricityPrice: Float!
    estimatedElectricityPrice: Float!
    totalConsumption: Float!
    house(id: String!): House
    coalPlant: CoalPlant!
  }  

  type Mutation {
    register(input: RegisterInput!) : LoginResult!
    login(email: String!, password: String!) : LoginResult!
    logout(token: String) : Boolean

    setElectricityPrice(newPrice: Float!) : Boolean!
    setCoalPlantState(state: String!) : Boolean!
    setCoalPlantRatio(ratio: Float!) : Boolean!
    updateWindParameters : Boolean!
    insertHouseholds(amount: Int!) : Boolean!
  }

  input RegisterInput {
    email: String!
    password: String!
    name: String!
    xCoord: Float!
    yCoord: Float!
  }

  type User {
    name: String!
    email: String!
    profilePictureURL: String!
    householdId: String!
    role: String!
  }

  type LoginResult {
    user: User!
    token: String!
  }

  type House {
    windSpeed: Float!,
    electricityConsumption: Float!
    electricityProduction: Float!
    failure: Boolean!
    temperature: Float!
    bufferLoad: Float!
    ratio: Float!
  }

  type CoalPlant {
    electricityProduction: Float!
    state: String!
    bufferLoad: Float!
    ratio: Float!
  }
`;
module.exports = typeDefs;