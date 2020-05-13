const { Household } = require('../db/dbModels')
const wind = require('./weather')

async function getAverageWindspeed(){
    let numberOfHouseholds = 0
    let averageWind = 0.0
    let households = await Household.find({}).cache(300);
    numberOfHouseholds = households.length
    for(let i = 0; i < households.length; i++){
        const speed = await wind.getWindSpeed(households[i].id)
        averageWind += speed
    }
    return averageWind / numberOfHouseholds;
}

module.exports = {
    getElectricityPrice: async function (){
        const windSpeed = await getAverageWindspeed()
        const price = (-0.36 * windSpeed) + 4.1
        if(price <= 0.5){
            return 0.5
        }else{
            return price
        }
    }
}