const jwt = require("jsonwebtoken");
const { AuthenticationError } = require("apollo-server-express");

const { User } = require("../db/dbModels");

async function generateRoleContext(payload) {
  try {
    const token = payload.req.headers.authorization || "";
    const userId = jwt.verify(token, process.env.JWT_KEY)["data"]["id"];
    const result = await User.findOne({ _id: userId });
    if (result.tokens.indexOf(token) == -1) {
      return { user: null, role: "unknown", token: "" };
    }
    return { user: result, role: result.role, token: token };
  } catch (exception) {
    console.log(exception)
    return { user: null, role: "unknown", token: "" };
  }
}

function checkPermission(context, role) {
  if (role !== context.role) {
    throw new AuthenticationError("Not allowd to perform that action");
  }
}

module.exports = {
  generateRoleContext,
  checkPermission,
};
