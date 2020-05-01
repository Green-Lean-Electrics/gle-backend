const stoch = require('stochastic')
const { UserInputError } = require('apollo-server-express');

const { CoalPlant } = require('../db/dbModels')

const COAL_PLANT_STARTUP_TIME_SECONDS = 30
const COAL_PLANT_SHUTDOWN_TIME_SECONDS = 30

module.exports = {
    getElectricityProduction: async function () {
        const coalPlant = await CoalPlant.findOne({})
        if (coalPlant.state === 'started') {
            return stoch.norm(200, 5.0, 1)
        } else {
            return 0.0
        }
    },
    getBufferLoad: async function () {
        const coalPlant = await CoalPlant.findOne({})
        console.log(coalPlant)
        return coalPlant.buffer.load
    },
    getRatio: async function () {
        const coalPlant = await CoalPlant.findOne({})
        return coalPlant.buffer.ratio
    },
    getState: async function () {
        const coalPlant = await CoalPlant.findOne({})
        return coalPlant.state
    },
    getElectricityPrice: async function () {
        const coalPlant = await CoalPlant.findOne({})
        return coalPlant.electricityPrice
    },

    setElectricityPrice: async function (newPrice) {
        await CoalPlant.updateOne({}, { $set: { electricityPrice: newPrice } })
        return true
    },
    setRatio: async function (newRatio) {
        if (newRatio < 0.0 || newRatio > 1.0) {
            throw new UserInputError('Ratio has to be between 0.0 and 1.0')
        }
        await CoalPlant.updateOne({}, { $set: { 'buffer.ratio': newRatio } })
        return true
    },
    setState: async function (state) {
        if (state !== 'start' && state !== 'stop') {
            throw new UserInputError('State has to be either start or stop')
        }

        const coalPlant = await CoalPlant.findOne({})
        if (coalPlant.state === 'starting' || coalPlant.state === 'stoping') {
            return false
        }

        if (state === 'start') {
            if (coalPlant.state === 'started') {
                return true
            }
            await CoalPlant.updateOne({}, { $set: { state: 'starting' } })
            setTimeout(
                async () => await CoalPlant.updateOne({}, { $set: { state: 'started' } }),
                COAL_PLANT_STARTUP_TIME_SECONDS * 1000
            )
            return true
        }

        if (state === 'stop') {
            if (coalPlant.state === 'stopped') {
                return true
            }
            await CoalPlant.updateOne({}, { $set: { state: 'stopping' } })
            setTimeout(
                async () => await CoalPlant.updateOne({}, { $set: { state: 'stopped' } }),
                COAL_PLANT_SHUTDOWN_TIME_SECONDS * 1000
            )
            return true
        }
    }
}