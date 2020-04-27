const random = require('random-number');
const stoch = require('stochastic')
const kmeans = require('node-kmeans');
const { Household } = require('../db/dbModels')

function updateClusters(households, mean, deviation, depth, nClusters = 2) {
    if (depth == 6 || households.length <= nClusters) {
        for (let i = 0; i < households.length; i++) {
            console.log('Actualizando ' + households[i].id + ' con ' + mean + ' y ' + deviation)
            Household.findByIdAndUpdate(households[i].id, { windSimulation: { mu: mean, sigma: deviation } })
        }
    } else {
        let positions = Array()
        for (let i = 0; i < households.length; i++) {
            positions[i] = [households[i].coords.x, households[i].coords.y];
        }
        kmeans.clusterize(positions, { k: nClusters }, (error, results) => {
            if (error) {
                console.log('Error while clustering in updateClusters(): ' + error)
            } else {
                for (let i = 0; i < results.length; i++) {
                    let newHouseholds = Array()
                    for (let j = 0; j < results[i].clusterInd.length; j++) {
                        newHouseholds[j] = households[results[i].clusterInd[j]]
                    }
                    updateClusters(newHouseholds, stoch.norm(mean, deviation), stoch.norm(mean / 5, deviation / 5), depth + 1)
                }
            }
        })
    }
}

module.exports = {
    getWindSpeed: async function (householdID) {
        const household = await Household.findById(householdID).cache(300)
        return stoch.norm(household.windSimulation.mu, household.windSimulation.sigma, 1)

    },
    getTemperature: async function (householdID) {
        const household = await Household.findById(householdID).cache(300)
        return household.weatherData.temperature

    },
    updateWindParameters: async function () {
        const households = await Household.find()
        const mu = random({ min: 10.0, max: 100.0 })
        const sigma = random({ min: 10.0, max: 100.0 })
        updateClusters(households, mu, sigma, 0)
    }
}