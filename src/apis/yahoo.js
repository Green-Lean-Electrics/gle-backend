const OAuth = require('oauth');
const config = require('../config')

function fecthData(xCoord, yCoord) {
    return new Promise(function (resolve, reject) {
        const header = { 'X-Yahoo-App-Id': config.yahoo.appID }
        const request = new OAuth.OAuth(
            null, null,
            config.yahoo.key,
            config.yahoo.secret,
            '1.0', null, 'HMAC-SHA1', null, header
        );
        request.get(
            'https://weather-ydn-yql.media.yahoo.com/forecastrss?lat=' + xCoord+ '&lon=' + yCoord + '&format=json&u=c',
            null,
            null,
            function (err, data, result) {
                if (err) {
                    console.log(err)
                    reject(Error(err))
                } else {
                    resolve(JSON.parse(data))
                }
            }
        )
    })
}

module.exports = {
    fetchTemperature: async function (xCoord, yCoord) {
        var response = await fecthData(xCoord, yCoord)
        return parseFloat(response["current_observation"]["condition"]["temperature"])
    },
    fetchTimezone: async function (xCoord, yCoord){
        var response = await fecthData(xCoord, yCoord)
        return response["location"]["timezone_id"]
    }
}


