const stoch = require('stochastic')
const { Household } = require('../db/dbModels')

const NOMINAL_POWER = 2500

module.exports = {

    checkFailure: async function (householdID) {
        return false //await Household.findById(householdID).windSimulation.failure
    },

    getElectricityProduction: async function (householdID) {
        const household = await Household.findById(householdID).cache(300)
        if(household.windSimulation.failure){
            return 0.0
        }else{
            windSpeed = stoch.norm(household.windSimulation.mu, household.windSimulation.sigma)
            if(windSpeed < 3.0){
                return 0.0
            }else if(windSpeed >= 3.0 && windSpeed <= 13.0){
                return Math.pow(windSpeed, 3)
            }else if(windSpeed >= 13.0 && windSpeed <= 25.0){
                return NOMINAL_POWER
            }else{
                return 0.0
            }
        }
    }
}