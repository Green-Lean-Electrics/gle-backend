const { Household } = require("../db/dbModels");
const coalPlant = require("./coalPlant");
const consumption = require("./electricityConsumption");
const production = require("./electricityProduction");
const cachegoose = require("cachegoose");
const { UserInputError } = require("apollo-server-express");
const MAX_HOUSE_BUFFER_LOAD = 7.0;
const MAX_COAL_BUFFER_LOAD = 200.0;

module.exports = {
  updateBuffers: async function () {
    console.log('actualizando buffers')
    // Households buffers
    const households = await Household.find({});
    let netPower = 0;
    for (let i = 0; i < households.length; i++) {
      const currentConsumption = await consumption.getElectricityConsumption(
        households[i]._id
      );
      const currentProduction = await production.getElectricityProduction(
        households[i]._id
      );
      const bufferLoad = households[i].buffer.load;

      const delta = currentProduction - currentConsumption;
      const ratio = households[i].buffer.ratio;

      //kW to be stored/taken in/from the buffer
      const deltaBuffer = ratio * delta;
      //kW to be sold/bought to/from the market
      const deltaMarket = (1 - ratio) * delta;

      let newBufferLoad;

      if (delta > 0) {
        if (await module.exports.isSellingBlocked(households[i]._id)) {
          if (bufferLoad + delta > MAX_HOUSE_BUFFER_LOAD) {
            newBufferLoad = MAX_HOUSE_BUFFER_LOAD;
          } else {
            newBufferLoad + bufferLoad + delta;
          }
        } else {
          // Sells to the market
          if (bufferLoad + deltaBuffer > MAX_HOUSE_BUFFER_LOAD) {
            // Buffer will be full and remaining has to be sold
            newBufferLoad = MAX_HOUSE_BUFFER_LOAD;
            netPower += bufferLoad + deltaBuffer - MAX_HOUSE_BUFFER_LOAD;
          } else {
            // Standard case
            newBufferLoad = bufferLoad + deltaBuffer;
          }
          netPower += deltaMarket;
        }
      } else {
        //Buys from the market
        if (bufferLoad - deltaBuffer < 0) {
          // Buffer will be empty and missing power has to be bought
          newBufferLoad = 0;
          netPower -= bufferLoad - deltaBuffer;
        } else {
          // Standard case
          newBufferLoad = bufferLoad - deltaBuffer;
        }
        netPower -= deltaMarket;
      }
      await Household.updateOne(
        { _id: households[i]._id },
        { "buffer.load": newBufferLoad }
      );
    }

    // // Coalplant buffers
    // const coalPlantProduction = coalPlant.getElectricityProduction();

    // const coalToBuffer = coalPlant.getRatio() * coalPlantProduction;
    // const coalToMarket = (1 - coalPlant.getRatio()) * coalPlantProduction;
  },

  getBufferLoad: async function (householdID) {
    const household = await Household.findById(householdID).cache(15);
    return household.buffer.load;
  },
  getRatio: async function (householdID) {
    const household = await Household.findById(householdID).cache(
      30,
      `${householdID}_ratio`
    );
    return household.buffer.ratio;
  },
  isSellingBlocked: async function (householdID) {
    const household = await Household.findById(householdID).cache(
      2,
      `${householdID}_block`
    );

    return household.blockingReleaseDate > new Date();
  },
  blockSelling: async function (householdID, seconds) {
    if (seconds < 10 || seconds > 100) {
      throw new UserInputError("Seconds to block must be between 10 and 100");
    }
    let releaseDate = new Date();
    releaseDate.setSeconds(releaseDate.getSeconds() + seconds);

    await Household.findOneAndUpdate(
      {
        _id: householdID,
      },
      {
        blockingReleaseDate: releaseDate.toISOString(),
      },
      { useFindAndModify: false, new: true }
    );
    cachegoose.clearCache(`${householdID}_block`);
    return true;
  },
};
