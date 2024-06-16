import ErrorHandler from "../utils/utility.js";
import jwt from "jsonwebtoken";
import { adminSecretKey } from "../app.js";
import { chatAppToken } from "../constants/config.js";
import User from "../models/userModel.js";

const authMiddleware = (req, res, next) => {
  try {
    const token = req.cookies[chatAppToken];

    if (!token) return next(new ErrorHandler("Please Login", 401));

    const verify = jwt.verify(token, process.env.JWT_SECRET);

    req.userId = verify._id;
    req.username = verify.username;

    next();
  } catch (error) {
    throw new Error(error);
  }
};

const adminOnly = (req, res, next) => {
  try {
    const token = req.cookies["chatAdminToken"];
    if (!token) return next(new ErrorHandler("Only admin can acess", 404));

    const secretKey = jwt.verify(token, process.env.JWT_SECRET);

    const isMatched = secretKey === adminSecretKey;
    if (!isMatched) return next(new ErrorHandler("Only admin can acess", 404));

    next();
  } catch (error) {
    throw new Error(error);
  }
};

const socketAutheticator = async (err, socket, next) => {
  try {
    if (err) return next(err);

    const authToken = socket.request.cookies[chatAppToken];

    const decodedData = jwt.verify(authToken, process.env.JWT_SECRET);

    const user = await User.findById(decodedData._id);

    if (!user) return next(new ErrorHandler("Login to access this route", 401));

    socket.user = user;

    return next();
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler("Login to access this route", 401));
  }
};

export default authMiddleware;
export { adminOnly, socketAutheticator };
