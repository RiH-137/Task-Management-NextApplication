const jwt = require("jsonwebtoken");
const { User, ProjectMember } = require("../models");
const { isValidObjectId } = require("../utils/ids");

const getJwtSecret = () => process.env.JWT_SECRET || "dev-secret";

const getJwtSignOptions = () => {
  const options = {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  };

  if (process.env.JWT_ISSUER) {
    options.issuer = process.env.JWT_ISSUER;
  }

  return options;
};

const getJwtVerifyOptions = () => {
  const options = {};

  if (process.env.JWT_ISSUER) {
    options.issuer = process.env.JWT_ISSUER;
  }

  return options;
};

const signUserToken = (user) =>
  jwt.sign({ sub: user.id }, getJwtSecret(), getJwtSignOptions());

const getTokenFromHeader = (req) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }
  return token;
};

const requireAuth = async (req, res, next) => {
  const token = getTokenFromHeader(req);

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret(), getJwtVerifyOptions());
    const userId = payload.sub;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

const getProjectMembership = async (projectId, userId) => {
  if (!isValidObjectId(projectId) || !isValidObjectId(userId)) {
    return null;
  }

  const membership = await ProjectMember.findOne({
    project_id: projectId,
    user_id: userId,
  });

  return membership || null;
};

const requireProjectRole = (allowedRoles = ["admin", "member"]) => async (req, res, next) => {
  const projectId = req.params.projectId || req.params.id;

  if (!projectId) {
    return res.status(400).json({ error: "Project id required" });
  }

  if (!isValidObjectId(projectId)) {
    return res.status(400).json({ error: "Invalid project id" });
  }

  try {
    const membership = await getProjectMembership(projectId, req.user.id);

    if (!membership || !allowedRoles.includes(membership.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    req.membership = membership;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  signUserToken,
  getProjectMembership,
  requireAuth,
  requireProjectRole,
};
