const stoch = require("stochastic");
const { UserInputError } = require("apollo-server-express");

const { CoalPlant, User } = require("../db/dbModels");
const cachegoose = require("cachegoose");

const COAL_PLANT_STARTUP_TIME_SECONDS = 30;
const COAL_PLANT_SHUTDOWN_TIME_SECONDS = 30;

module.exports = {
  getElectricityProduction: async function () {
    const coalPlant = await CoalPlant.findOne({}).cache(10, `coal_state`);
    if (coalPlant.state === "RUNNING") {
      return stoch.norm(200, 1.2, 1);
    } else {
      return 0.0;
    }
  },

  getGridDemand: async function () {
    const coalPlant = await CoalPlant.findOne({}).cache(10, `coal_demand`);
    if (coalPlant.gridDemand > 2) {
      return Math.max(0, stoch.norm(coalPlant.gridDemand, 2, 1));
    } else {
      if (coalPlant.gridDemand > 0) {
        return Math.max(0, stoch.norm(coalPlant.gridDemand, 0.2, 1));
      }
    }
    return 0.0;
  },

  getBufferLoad: async function () {
    const coalPlant = await CoalPlant.findOne({}).cache(30, `coal_buffer`);
    return coalPlant.buffer.load;
  },
  getRatio: async function () {
    const coalPlant = await CoalPlant.findOne({}).cache(30, `coal_ratio`);
    return coalPlant.buffer.ratio;
  },
  getState: async function () {
    const coalPlant = await CoalPlant.findOne({}).cache(30, `coal_state`);
    return coalPlant.state;
  },
  getElectricityPrice: async function () {
    const coalPlant = await CoalPlant.findOne({}).cache(30, `coal_price`);
    return coalPlant.electricityPrice;
  },

  getBlackouts: async function () {
    const coalPlant = await CoalPlant.findOne({}).cache(30, `coal_blackouts`);
    console.log(coalPlant.blackouts);
    const users = await User.find({ role: "PROSUMER_ROLE" }).cache(300);
    return users
      .filter((user) =>
        coalPlant.blackouts.includes(user.householdId.toString())
      )
      .map((user) => {
        return (({
          name,
          email,
          profilePictureURL,
          householdId,
          lastSeen,
        }) => ({ name, email, profilePictureURL, householdId, lastSeen }))(
          user
        );
      });
  },

  setElectricityPrice: async function (newPrice) {
    await CoalPlant.updateOne({}, { $set: { electricityPrice: newPrice } });
    cachegoose.clearCache(`coal_price`);
    return true;
  },
  setRatio: async function (newRatio) {
    if (newRatio < 0.0 || newRatio > 1.0) {
      throw new UserInputError("Ratio has to be between 0.0 and 1.0");
    }
    await CoalPlant.updateOne({}, { $set: { "buffer.ratio": newRatio } });
    cachegoose.clearCache(`coal_ratio`);
    return true;
  },
  setState: async function (requestedState) {
    if (requestedState !== "RUNNING" && requestedState !== "STOPPED") {
      throw new UserInputError("State has to be either start or stop");
    }

    const coalPlant = await CoalPlant.findOne({});
    if (coalPlant.state === "STARTING" || coalPlant.state === "STOPPING") {
      return false;
    }

    if (requestedState === "RUNNING") {
      if (coalPlant.state === "RUNNING") {
        return true;
      }
      await CoalPlant.updateOne({}, { $set: { state: "STARTING" } });
      cachegoose.clearCache(`coal_state`);
      setTimeout(async () => {
        await CoalPlant.updateOne({}, { $set: { state: "RUNNING" } });
        cachegoose.clearCache(`coal_state`);
      }, COAL_PLANT_STARTUP_TIME_SECONDS * 1000);
      return true;
    }

    if (requestedState === "STOPPED") {
      if (coalPlant.state === "STOPPED") {
        return true;
      }
      await CoalPlant.updateOne({}, { $set: { state: "STOPPING" } });
      cachegoose.clearCache(`coal_state`);
      setTimeout(async () => {
        await CoalPlant.updateOne({}, { $set: { state: "STOPPED" } });
        cachegoose.clearCache(`coal_state`);
      }, COAL_PLANT_SHUTDOWN_TIME_SECONDS * 1000);
      return true;
    }
  },
};
