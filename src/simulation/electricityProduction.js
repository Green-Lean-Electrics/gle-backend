const stoch = require("stochastic");
const cachegoose = require("cachegoose");
const jwt = require("jsonwebtoken");
const {
  UserInputError,
  AuthenticationError,
} = require("apollo-server-express");

const { Household, User } = require("../db/dbModels");

const NOMINAL_POWER = 100;

module.exports = {
  checkFailure: async function (householdID) {
    return false; //await Household.findById(householdID).windSimulation.failure
  },

  getElectricityProduction: async function (householdID) {
    const household = await Household.findById(householdID).cache(
      300,
      `${householdID}_wind`
    );
    if (household.windSimulation.failure) {
      return 0.0;
    } else {
      windSpeed = stoch.norm(
        household.windSimulation.mu,
        household.windSimulation.sigma
      );
      if (windSpeed < 3.0) {
        return 0.0;
      } else if (windSpeed >= 3.0 && windSpeed <= 13.0) {
        return Math.pow(windSpeed, 3) / 100;
      } else if (windSpeed >= 13.0 && windSpeed <= 25.0) {
        return NOMINAL_POWER;
      } else {
        return 0.0;
      }
    }
  },

  setHouseholdRatio: async function (newRatio, token) {
    if (newRatio < 0.0 || newRatio > 1.0) {
      throw new UserInputError("Selected ratio is invalid");
    }

    const userId = jwt.verify(token, process.env.JWT_KEY)["data"]["id"];
    const user = await User.findOne({ _id: userId });

    if (!user) {
      throw new AuthenticationError("Unknown user");
    }

    await Household.findOneAndUpdate(
      { _id: user.householdId },
      { "buffer.ratio": newRatio },
      { useFindAndModify: false }
    );
    cachegoose.clearCache(`${user.householdId}_ratio`);
    return true;
  },
};
