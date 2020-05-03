const jwt = require("jsonwebtoken");
const { AuthenticationError } = require("apollo-server-express");
const { createModel } = require("mongoose-gridfs");
const { User, Household } = require("../db/dbModels");

module.exports = {
  uploadHoseholdPicture: async function (picture, token) {
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

    await Household.findOneAndUpdate(
      { _id: user.householdId },
      {
        householdPictureURL: pictureURL,
      },
      { useFindAndModify: false }
    );

    return pictureURL;
  },

  getHouseholdPicture: async function (householdId) {
    let { householdPictureURL } = await Household.findOne({
      _id: householdId,
    });
    return householdPictureURL;
  },
};
