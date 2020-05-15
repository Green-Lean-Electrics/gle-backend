const random = require("random-number");
const stoch = require("stochastic");
const kmeans = require("node-kmeans");
const { Household } = require("../db/dbModels");
const cachegoose = require("cachegoose");

function updateClusters(households, nClusters = 2) {
  let positions = Array();
  for (let i = 0; i < households.length; i++) {
    positions[i] = [households[i].coords.x, households[i].coords.y];
  }
  kmeans.clusterize(positions, { k: nClusters }, async (error, results) => {
    if (error) {
    } else {
        console.log(results);
      for (let i = 0; i < results.length; i++) {
        const mu = random({ min: 2.0, max: 11.0 });
        for (let j = 0; j < results[i].clusterInd.length; j++) {
            console.log('Casa ' + households[results[i].clusterInd[j]]._id + ' en cluster ' + i);
          await Household.updateOne(
            { _id: households[results[i].clusterInd[j]]._id },
            {
              $set: {
                "windSimulation.mu": stoch.norm(mu, 1, 1),
                "windSimulation.sigma": 0.5,
              },
            }
          )
          cachegoose.clearCache(`${households[results[i].clusterInd[j]]._id}_wind`);
        }
      }
    }
  });
}

module.exports = {
  getWindSpeed: async function (householdID) {
    const household = await Household.findById(householdID).cache(300, `${householdID}_wind`);
    return stoch.norm(
      household.windSimulation.mu,
      household.windSimulation.sigma,
      1
    );
  },
  getTemperature: async function (householdID) {
    const household = await Household.findById(householdID).cache(300);
    return household.weatherData.temperature;
  },
  updateWindParameters: async function () {
    const households = await Household.find();
    await updateClusters(households, 4);
  },
};
