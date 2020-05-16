const { Household, CoalPlant } = require("../db/dbModels");
const coalPlant = require("./coalPlant");
const consumption = require("./electricityConsumption");
const production = require("./electricityProduction");
const cachegoose = require("cachegoose");
const { UserInputError } = require("apollo-server-express");
const MAX_HOUSE_BUFFER_LOAD = 7.0;
const MAX_COAL_BUFFER_LOAD = 200.0;

module.exports = {
  updateBuffers: async function (iterationsPerHour) {
    // Households buffers
    const households = await Household.find({}).cache(40);

    let netPower = 0;
    let gridDemand = 0;
    let blackoutHouseholds = [];

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
        newBufferLoad = Math.min(
          bufferLoad + deltaBuffer / iterationsPerHour,
          MAX_HOUSE_BUFFER_LOAD
        );
        if (!(await module.exports.isSellingBlocked(households[i]._id))) {
          // Sells to the market
          if (
            bufferLoad + deltaBuffer / iterationsPerHour >
            MAX_HOUSE_BUFFER_LOAD
          ) {
            // Buffer will be full and remaining has to be sold
            netPower += bufferLoad + deltaBuffer - MAX_HOUSE_BUFFER_LOAD;
          }
          netPower += deltaMarket;
        }
      } else {
        //Buys from the market; deltaBuffer and deltaMarket are negative
        if (deltaMarket < 0) {
          blackoutHouseholds.push(households[i]._id);
        }
        newBufferLoad = Math.max(
          bufferLoad + deltaBuffer / iterationsPerHour,
          0
        );

        if (bufferLoad + deltaBuffer / iterationsPerHour < 0) {
          // Buffer will be empty and missing power has to be bought
          netPower += bufferLoad + deltaBuffer / iterationsPerHour;
        }
        netPower += deltaMarket;
      }

      await Household.updateOne(
        { _id: households[i]._id },
        { "buffer.load": newBufferLoad }
      );
      cachegoose.clearCache(`${households[i]._id}_buffer`);
    }

    gridDemand = Math.max(0, -1 * netPower);

    // Coalplant buffer

    const coalPlantProduction = await coalPlant.getElectricityProduction();
    let coalPlantBufferLoad = await coalPlant.getBufferLoad();
    if (coalPlantProduction > 0) {
      const coalToBuffer = (await coalPlant.getRatio()) * coalPlantProduction;
      const coalToMarket =
        (1 - (await coalPlant.getRatio())) * coalPlantProduction;

      coalPlantBufferLoad = Math.min(
        MAX_COAL_BUFFER_LOAD,
        coalPlantBufferLoad + coalToBuffer / iterationsPerHour
      );

      netPower += coalToMarket;
    } else {
      if (netPower < 0) {
        coalPlantBufferLoad = Math.max(
          0,
          coalPlantBufferLoad + netPower / iterationsPerHour
        );
        netPower += coalPlantBufferLoad / iterationsPerHour;
      }
    }

    if (netPower > 0) {
      //No blackouts happended
      blackoutHouseholds = [];
    }

    await CoalPlant.updateOne(
      {},
      {
        $set: {
          "buffer.load": coalPlantBufferLoad,
          gridDemand: gridDemand,
          blackouts: blackoutHouseholds,
        },
      }
    );
    cachegoose.clearCache(`coal_buffer`);
    cachegoose.clearCache(`coal_demand`);
    cachegoose.clearCache(`coal_blackouts`);
  },

  getBufferLoad: async function (householdID) {
    const household = await Household.findById(householdID).cache(
      15,
      `${householdID}_buffer`
    );
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
      15,
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
