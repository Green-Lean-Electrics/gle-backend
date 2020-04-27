const jwt = require("jsonwebtoken");
const { AuthenticationError } = require("apollo-server");

const { User } = require("../db/dbModels");

async function generateRoleContext(payload) {
  try {
    const token = payload.req.headers.authorization || "";
    const email = jwt.verify(token, process.env.JWT_KEY)["data"]["email"];

    const result = await User.findOne({ email: email });

    if (result.tokens.indexOf(token) == -1) {
      return { user: null, role: "unknown" };
    }
    return { user: email, role: result.role };
  } catch (exception) {
    return { user: null, role: "unknown" };
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
