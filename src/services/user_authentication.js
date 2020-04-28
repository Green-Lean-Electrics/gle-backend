const {
  UserInputError,
  AuthenticationError,
  ApolloError,
} = require("apollo-server");

const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const random = require("random-number");

const yahoo = require("../apis/yahoo");
const { User, Household } = require("../db/dbModels");

module.exports = {
  signup: async function (input) {
    let result = await User.find({ email: input.email });
    if (result.length != 0) {
      throw new UserInputError("Email already in use");
    }

    let newHousehold = Household({
      coords: {
        x: input.xCoord,
        y: input.yCoord,
      },
      windSimulation: {
        mu: random({ max: 70, min: 2 }),
        sigma: random({ max: 10, min: 0 }),
        failure: Math.random > 0.99,
      },
      weatherData: {
        lastRetrieved: new Date(),
        temperature: await yahoo.fetchTemperature(input.xCoord, input.yCoord),
        timezone: await yahoo.fetchTimezone(input.xCoord, input.yCoord),
      },
      buffer: {
        load: 0.0,
        ratio: 0.3,
      },
    });

    newHousehold = await newHousehold.save();

    const token = jwt.sign(
      { data: { date: Date.now, email: input.email } },
      process.env.JWT_KEY
    );

    let newUser = User({
      name: input.name,
      email: input.email,
      password: await bcrypt.hash(input.password, 10),
      role: "PROSUMER_ROLE",
      token: [token],
      householdId: newHousehold._id,
    });

    newUser = await newUser.save();

    return {
      token: token,
      user: {
        name: newUser.name,
        email: newUser.email,
        profilePictureURL: "",
        householdId: newHousehold._id,
        role: newUser.role,
      },
    };
  },

  login: async function (email, password) {
    const result = await User.findOne({ email: email });
    if (!result) {
      throw new AuthenticationError("Unknown user or password");
    }
    const match = await bcrypt.compare(password, result.password);
    if (!match) {
      throw new AuthenticationError("Unknown user or password");
    }

    const token = jwt.sign(
      { data: { date: Date.now, email: email } },
      process.env.JWT_KEY
    );

    result.tokens.push(token);
    result.save((err, _) =>
      console.log("[AUTH] Error while logging in: " + err)
    );

    console.log(result);

    return {
      token: token,
      user: result,
    };
  },

  logout: async function (token) {
    const email = jwt.verify(token, process.env.JWT_KEY)["data"]["email"];
    const result = await User.findOne({ email: email });
    if (result.tokens.indexOf(token) == -1) {
      throw new AuthenticationError("Unknown token");
    }
    result.tokens = result.tokens.filter((t) => token !== t);
    result.save((err, _) =>
      console.log("[AUTH] Error while logging out: " + err)
    );
    return true;
  },
};
