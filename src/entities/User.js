const {
  UserInputError,
  AuthenticationError,
} = require("apollo-server-express");

const mongoose = require("mongoose");
const { createModel } = require("mongoose-gridfs");
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
        mu: random({ max: 12, min: 2 }),
        sigma: random({ max: 0.5, min: 0.1 }),
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

    const newUserId = mongoose.Types.ObjectId();

    const token = jwt.sign(
      { data: { date: Date.now, id: newUserId } },
      process.env.JWT_KEY
    );

    let newUser = User({
      _id: newUserId,
      name: input.name,
      email: input.email,
      password: await bcrypt.hash(input.password, 10),
      profilePictureURL: "/pictures?id=5eac22235a3ce4001784cede",
      role: "PROSUMER_ROLE",
      tokens: [token],
      householdId: newHousehold._id,
    });

    newUser = await newUser.save();

    return {
      token: token,
      user: newUser,
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
      { data: { date: Date.now, id: result._id } },
      process.env.JWT_KEY
    );

    result.tokens.push(token);
    result.lastSeen = new Date().toISOString();
    result.save((err, _) => {
      if (err) {
        console.log("[AUTH] Error while logging in: " + err);
      }
    });

    return {
      token: token,
      user: result,
    };
  },

  logout: async function (token) {
    try {
      const userId = jwt.verify(token, process.env.JWT_KEY)["data"]["id"];
      const result = await User.findOne({ _id: userId });
      if (result.tokens.indexOf(token) == -1) {
        throw new AuthenticationError("Unknown token");
      }
      result.tokens = result.tokens.filter((t) => token !== t);
      result.save((err, _) => {
        if (err) {
          console.log("[AUTH] Error while logging out: " + err);
        }
      });
      return true;
    } catch {
      return false;
    }
  },

  updateUser: async function (input, token) {
    const userId = jwt.verify(token, process.env.JWT_KEY)["data"]["id"];
    const user = await User.findOne({ _id: userId });

    if (!user) {
      throw new AuthenticationError("Unknown user");
    }

    let newPicture = user.profilePictureURL;
    if (input.picture) {
      const { createReadStream, mimetype } = await input.picture;
      const readStream = createReadStream();
      const ProfilePicture = createModel();
      const options = {
        filename: user._id.toString() + ".png",
        contentType: mimetype,
      };
      const file = await new Promise((resolve, reject) =>
        ProfilePicture.write(options, readStream, (error, file) => {
          if (error) {
            reject(error);
          }
          resolve(file);
        })
      );
      newPicture = "/pictures?id=" + file._id;
    }

    const newPassword =
      input.password === ""
        ? user.password
        : await bcrypt.hash(input.password, 10);

    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id },
      {
        name: input.name,
        email: input.email,
        password: newPassword,
        profilePictureURL: newPicture,
      },
      { useFindAndModify: false, new: true }
    );
    return updatedUser;
  },

  updateLastSeen: async function (userId) {
    await User.findOneAndUpdate(
      { _id: userId },
      {
        lastSeen: new Date().toISOString(),
      },
      { useFindAndModify: false, new: true }
    );
  },

  getAllUsers: async function () {
    let users = await User.find({ role: "PROSUMER_ROLE" });
    return users;
  },

  deleteUser: async function (userEmail) {
    const userToDelete = await User.findOne({ email: userEmail });
    if (!userToDelete) {
      throw new UserInputError("Unknown user to delete");
    }

    await Household.findOneAndRemove({ _id: userToDelete.householdId });
    await User.findOneAndRemove({ _id: userToDelete._id });

    return true;
  },
};
