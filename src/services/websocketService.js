const stoch = require("stochastic");
const weather = require("../simulation/weather");
const consumption = require("../simulation/electricityConsumption");
const production = require("../simulation/electricityProduction");
const buffer = require("../simulation/buffers");
const auth = require("../graphql/authentication");

async function sendCoalPlantInformation(connection) {
  const info = {
    realPrice: 2.0,
    estimatedPrice: stoch.norm(2, 0.25, 1),
    totalDemand: stoch.norm(400, 5.0, 1),
    bufferLoad: stoch.norm(150, 5.0, 1),
    ratio: 0.5,
    coalPlantState: "RUNNING",
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
    //electricityPrice: await coalPlant.getElectricityPrice(),
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
            }, 100);
          } else {
            if (
              (await auth.isHouseholdOwner(householdId, token)) ||
              (await auth.isManager(token))
            ) {
              task = setInterval(function () {
                sendHouseholdInformation(connection, householdId);
              }, 100);
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
