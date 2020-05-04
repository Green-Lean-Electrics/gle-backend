const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type Query {
    electricityPrice: Float!
    estimatedElectricityPrice: Float!
    totalConsumption: Float!
    house(id: String!): House
    coalPlant: CoalPlant!
  }  

  type Mutation {
    signup(input: SignupInput!): LoginResult!
    login(email: String!, password: String!): LoginResult!
    logout: Boolean!
    updateUser(input: UpdateUserInput!) : User!

    setHouseholdRatio(newRatio: Float!) : Boolean!
    uploadHouseholdPicture(picture: Upload!, pictureKind: String!):  String!

    setElectricityPrice(newPrice: Float!) : Boolean!
    setCoalPlantState(state: String!) : Boolean!
    setCoalPlantRatio(ratio: Float!) : Boolean!
    updateWindParameters : Boolean!
    insertHouseholds(amount: Int!) : Boolean!
  }

  input UpdateUserInput{
    email: String!
    password: String!
    name: String!
    picture: Upload
  }

  input SignupInput {
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
    frontPictureURL: String,
    backPictureURL: String
    coords: Coords!
  }

  type Coords {
    x: Float!
    y: Float!
  }

  type CoalPlant {
    electricityProduction: Float!
    state: String!
    bufferLoad: Float!
    ratio: Float!
  }
`;
module.exports = typeDefs;