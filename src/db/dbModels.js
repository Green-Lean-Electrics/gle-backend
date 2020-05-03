const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    auto: true,
  },
  name: String,
  email: String,
  password: String,
  role: String, 
  profilePictureURL: String,
  tokens: [String],
  householdId: { type: Schema.Types.ObjectId, ref: "household" },
});

const householdSchema = new Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    auto: true,
  },
  coords: {
    x: Number,
    y: Number,
  },
  windSimulation: {
    mu: Number,
    sigma: Number,
    failure: Boolean,
  },
  created: {
    type: Date,
    default: Date.now,
  },
  householdPictureURL: String,
  weatherData: {
    lastRetrieved: Date,
    temperature: Number,
    timezone: String,
  },
  buffer: {
    load: Number,
    ratio: Number,
  },
});

const coalPlantSchema = new Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    auto: true,
  },
  buffer: {
    load: Number,
    ratio: Number,
  },
  state: String,
  electricityPrice: Number,
});

const Household = mongoose.model("household", householdSchema);
const User = mongoose.model("user", userSchema);
const CoalPlant = mongoose.model("coalPlant", coalPlantSchema);

module.exports = {
  Household,
  User,
  CoalPlant,
};
