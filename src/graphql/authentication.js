const jwt = require("jsonwebtoken");
const { AuthenticationError } = require("apollo-server-express");

const { User } = require("../db/dbModels");
const { updateLastSeen } = require("../entities/User");

async function generateRoleContext(payload) {
  try {
    const token = payload.req.headers.authorization || "";
    const userId = jwt.verify(token, process.env.JWT_KEY)["data"]["id"];
    const result = await User.findOne({ _id: userId });
    if (result.tokens.indexOf(token) == -1) {
      return { user: null, role: "unknown", token: "", householdId: "" };
    }

    await updateLastSeen(userId);

    return {
      user: result,
      role: result.role,
      token: token,
      householdId: result.householdId,
    };
  } catch (exception) {
    console.log(exception);
    return { user: null, role: "unknown", token: "" };
  }
}

function checkPermission(context, role) {
  if (role !== context.role) {
    throw new AuthenticationError("Not allowd to perform that action");
  }
}

async function isHouseholdOwner(householdId, token) {
  try {
    const userId = jwt.verify(token, process.env.JWT_KEY)["data"]["id"];
    const result = await User.findOne({ _id: userId, householdId: householdId});
    if(result) {
      return true;
    } else {
      return false;
    }
  } catch (e){
    console.log(e)
    return false;
  }
}

async function isManager(token) {
  try {
    const userId = jwt.verify(token, process.env.JWT_KEY)["data"]["id"];
    const result = await User.findOne({ _id: userId });
    return result.role === "MANAGER_ROLE";
  } catch {
    return false;
  }  
}

function checkOwnership(context, householdId) {
  if (householdId != context.householdId) {
    throw new AuthenticationError("Not allowd to perform that action");
  }
}

module.exports = {
  generateRoleContext,
  checkPermission,
  isHouseholdOwner,
  checkOwnership,
  isManager
};
