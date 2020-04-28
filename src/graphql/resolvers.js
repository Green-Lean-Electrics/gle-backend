
const auth = require('../graphql/authentication')
const user_auth = require('../services/user_authentication')
const weather = require('../simulation/weather')
const consumption = require('../simulation/electricityConsumption')
const price = require('../simulation/electricityPrice')
const production = require('../simulation/electricityProduction')
const coalPlant = require('../simulation/coalPlant')
const buffer = require('../simulation/buffers')


const resolvers = {
    Query: {
        house: (_, { id }) => {
            return {
                windSpeed: weather.getWindSpeed(id),
                electricityConsumption: consumption.getElectricityConsumption(id),
                electricityProduction: production.getElectricityProduction(id),
                failure: production.checkFailure(id),
                temperature: weather.getTemperature(id),
                bufferLoad: buffer.getBufferLoad(id),
                ratio: buffer.getRatio(id)
            }
        },
        coalPlant: (_, __, context) => {
            auth.checkPermission(context, "manager")
            return {
                electricityProduction: coalPlant.getElectricityProduction(),
                state: coalPlant.getState(),
                bufferLoad: coalPlant.getBufferLoad(),
                ratio: coalPlant.getRatio()
            }
        },
        electricityPrice: (parent, args, context) => {
            return coalPlant.getElectricityPrice()
        },
        estimatedElectricityPrice: (_, __, context) => {
            auth.checkPermission(context, "manager")
            return price.getElectricityPrice()
        },
        totalConsumption: (_, __, context) => {
            auth.checkPermission(context, "manager")
            return consumption.getTotalConsumption()
        }
    },
    Mutation: {
        // Cambiar ratios
        //  - Casas
        //  - Planta carbón
        // Bloquear venta
        setElectricityPrice: (_, { newPrice }, context) => {
            auth.checkPermission(context, "manager")
            return coalPlant.setElectricityPrice(newPrice)
        },
        setCoalPlantState: (_, { state }, context) => {
            auth.checkPermission(context, "manager")
            return coalPlant.setState(state)
        },
        setCoalPlantRatio: (_, { ratio }, context) => {
            auth.checkPermission(context, "manager")
            return coalPlant.setRatio(ratio)
        },
        updateWindParameters: () => {
            weather.updateWindParameters()
            return true
        },
        signup : (_, {input}, context) => {
            return user_auth.signup(input)
        },
        login : (_, {email, password}, context) => {
            return user_auth.login(email, password)
        }        
    }
};

module.exports = resolvers;
