const weather = require("../simulation/weather");
const consumption = require("../simulation/electricityConsumption");
const production = require("../simulation/electricityProduction");
const buffer = require("../simulation/buffers");
const auth = require("../graphql/authentication");

async function sendInformation(connection, householdId) {
  const info = {
    windSpeed: await weather.getWindSpeed(householdId),
    temperature: await weather.getTemperature(householdId),
    electricityConsumption: await consumption.getElectricityConsumption(
      householdId
    ),
    electricityProduction: await production.getElectricityProduction(
      householdId
    ),
    //electricityPrice: await coalPlant.getElectricityPrice(),
    failure: await production.checkFailure(householdId),
    bufferLoad: await buffer.getBufferLoad(householdId),
    ratio: await buffer.getRatio(householdId),
  };
  connection.sendUTF(JSON.stringify(info));
}

function handleWebsocketRequests(websocketServer) {
  websocketServer.on("request", async function (request) {
    let task;
    var connection = request.accept(null, request.origin);
    connection.on("message", async function (message) {
      if (message.type === "utf8") {
        try {
          const { householdId, token } = JSON.parse(message.utf8Data);
          if (await auth.isHouseholdOwner(householdId, token)) {
            task = setInterval(function () {
              sendInformation(connection, householdId);
            }, 100);
          } else {
            console.log("Invalid request");
          }
        } catch {
          console.log("Error processing WS request");
        }
      }
    });
    connection.on("close", function (_, __) {
      clearInterval(task);
    });
  });
}

module.exports = handleWebsocketRequests;
