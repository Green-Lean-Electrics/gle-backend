const stoch = require("stochastic");
const weather = require("../simulation/weather");
const consumption = require("../simulation/electricityConsumption");
const production = require("../simulation/electricityProduction");
const price = require("../simulation/electricityPrice");
const buffer = require("../simulation/buffers");
const auth = require("../graphql/authentication");

const coalPlant = require("../simulation/coalPlant");

async function sendCoalPlantInformation(connection) {
  const info = {
    realPrice: await coalPlant.getElectricityPrice(),
    estimatedPrice: await price.getElectricityPrice(),
    totalDemand: await coalPlant.getGridDemand(),
    bufferLoad: await coalPlant.getBufferLoad(),
    ratio: await coalPlant.getRatio(),
    coalPlantState: await coalPlant.getState(),
    coalPlantProduction: await coalPlant.getElectricityProduction(),
    blackouts: await coalPlant.getBlackouts(),
  };
  connection.sendUTF(JSON.stringify(info));
}

async function sendHouseholdInformation(connection, householdId) {
  const info = {
    windSpeed: await weather.getWindSpeed(householdId),
    temperature: await weather.getTemperature(householdId),
    electricityConsumption: await consumption.getElectricityConsumption(
      householdId
    ),
    electricityProduction: await production.getElectricityProduction(
      householdId
    ),
    electricityPrice: await coalPlant.getElectricityPrice(),
    failure: await production.checkFailure(householdId),
    bufferLoad: await buffer.getBufferLoad(householdId),
    ratio: await buffer.getRatio(householdId),
    isSellingBlocked: await buffer.isSellingBlocked(householdId),
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
          if (householdId === "COAL_PLANT" && (await auth.isManager(token))) {
            task = setInterval(function () {
              sendCoalPlantInformation(connection, householdId);
            }, 1000);
          } else {
            if (
              (await auth.isHouseholdOwner(householdId, token)) ||
              (await auth.isManager(token))
            ) {
              task = setInterval(function () {
                sendHouseholdInformation(connection, householdId);
              }, 1000);
            } else {
              console.log("Invalid WS request");
            }
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
