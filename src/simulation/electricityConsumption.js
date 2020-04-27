const random = require('random-number');
const Polynomial = require('polynomial')
const yahoo = require('../apis/yahoo')
const { Household } = require('../db/dbModels')

function getTimeBasedDemand(timestamp) {
    const coeficients = [-2.91343724e-09, 2.90035599e-07, -1.18207359e-05, 2.53002621e-04, -3.03475435e-03,
        2.02540393e-02, -7.20371748e-02, 1.39301290e-01, -1.61533917e-01, 3.94372717e-01]
    var polynomial = Polynomial(coeficients.reverse())
    const time = timestamp.getHours() + timestamp.getMinutes() / 60
    return polynomial.eval(time) * 4.95
}

function getTemperatureFactor(temperature) {
    const coeficients = [6.33288704e-05, 1.89441246e-03, -9.68591625e-02, 1.04857274e+00]
    var polynomial = Polynomial(coeficients.reverse())
    return polynomial.eval(temperature)
}




module.exports = {
    getElectricityConsumption: async function (householdID) {
        const MINUTE_IN_MILIS = 60000
        const MAX_DATA_MINUTES = 5

        const household = await Household.findById(householdID).cache(300)
        const now = new Date()
        const lastRetrieved = household.weatherData.lastRetrieved
        const delta = Math.abs(lastRetrieved == undefined ? 0.0 : lastRetrieved.getTime() - now.getTime())
        let temperature
        if (delta < MAX_DATA_MINUTES * MINUTE_IN_MILIS) {
            temperature = await yahoo.fetchTemperature(household.coords.x, household.coords.y)
            Household.findByIdAndUpdate(householdID, {weatherData: {temperature: temperature, lastRetrieved: new Date()}})
        } else {
            temperature = household.weatherData.temperature
        }
        const localTime = new Date().toLocaleString("en-US", { timeZone: household.weatherData.timezone});
        const cleanDemand = getTemperatureFactor(temperature) * getTimeBasedDemand(new Date(localTime))
        return cleanDemand + random({min: -0.06, max: 0.06}) * cleanDemand
    },

    getTotalConsumption: async function (){
        let totalConsumption = 0
        let households = await Household.find({})
        for(let i = 0; i < households.length; i++){
            const householdConsumption = await this.getElectricityConsumption(households[i].id)
            totalConsumption += householdConsumption
        }
        return totalConsumption
    }    
}