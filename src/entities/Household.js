const jwt = require("jsonwebtoken");
const {
  AuthenticationError,
  UserInputError,
} = require("apollo-server-express");
const { createModel } = require("mongoose-gridfs");
const { User, Household } = require("../db/dbModels");

module.exports = {
  uploadHoseholdPicture: async function (picture, kind, token) {
    const userId = jwt.verify(token, process.env.JWT_KEY)["data"]["id"];
    const user = await User.findOne({ _id: userId });

    if (!user) {
      throw new AuthenticationError("Unknown user");
    }

    const { createReadStream, mimetype } = await picture;
    const readStream = createReadStream();
    const HouseholdPicture = createModel();

    const options = {
      filename: user.householdId.toString() + ".png",
      contentType: mimetype,
    };
    const file = await new Promise((resolve, reject) =>
      HouseholdPicture.write(options, readStream, (error, file) => {
        if (error) {
          reject(error);
        }
        resolve(file);
      })
    );

    const pictureURL = "/pictures?id=" + file._id;

    if (kind === "FRONT_YARD") {
      await Household.findOneAndUpdate(
        { _id: user.householdId },
        {
          frontPictureURL: pictureURL,
        },
        { useFindAndModify: false }
      );
      return pictureURL;
    }

    if (kind === "BACK_YARD") {
      await Household.findOneAndUpdate(
        { _id: user.householdId },
        {
          backPictureURL: pictureURL,
        },
        { useFindAndModify: false }
      );
      return pictureURL;
    }

    throw new UserInputError("Unknown picture type: " + kind);
  },

  getPicture: async function (householdId, pictureKind) {
    if (pictureKind === "FRONT_YARD") {
      const { frontPictureURL } = await Household.findOne({
        _id: householdId,
      });
      return frontPictureURL;
    }

    if (pictureKind === "BACK_YARD") {
      const { backPictureURL } = await Household.findOne({
        _id: householdId,
      });
      return backPictureURL;
    }

    throw new UserInputError("Unknown picture type");
  },

  getCoords: async function (householdId) {
    const { coords } = await Household.findOne({
      _id: householdId,
    });
    return coords;
  },
};
