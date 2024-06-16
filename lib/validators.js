import { body, param, validationResult } from "express-validator";
import ErrorHandler from "../utils/utility.js";

const validateHandler = (req, res, next) => {
  const errors = validationResult(req);

  const errorMessages = errors
    .array()
    .map((error) => error.msg)
    .join(", ");

  if (errors.isEmpty()) return next();
  else return next(new ErrorHandler(errorMessages, 400));
};

// for registration
const registerValidator = () => [
  body("name", "Please Enter Your Name").notEmpty(),
  body("username", "Please Enter Your username").notEmpty(),
  body("bio", "Please Enter Your Bio").notEmpty(),
  body("password", "Please Enter Your Password").notEmpty(),
  // body("password", "Password must be Strong").isStrongPassword(),
];

// for Login
const loginValidator = () => [
  body("username", "Please Enter Your username").notEmpty(),
  body("password", "Please Enter Your Password").notEmpty(),
];

// For Group
const newGroupValidator = () => [
  body("name", "Please Enter Group Name").notEmpty(),
  body("members")
    .notEmpty()
    .withMessage("PLease add members")
    .isArray({ min: 2, max: 100 })
    .withMessage("Members must be 2-100"),
];

const addMemberValidator = () => [
  body("chatId", "PLease select chat first").notEmpty(),
  body("members")
    .notEmpty()
    .withMessage("PLease add members")
    .isArray({ min: 1, max: 97 })
    .withMessage("Members must be 1-97"),
];

const removeMemberValidator = () => [
  body("chatId", "PLease select chat first to remove member").notEmpty(),
  body("userId", "PLease select member to remove").notEmpty(),
];

const leaveGroupValidator = () => [
  param("id", "Please Enter ChatId").notEmpty(),
];

const chatIdValidator = () => [param("id", "Please Enter ChatId").notEmpty()];

const sendAttachmentsValidator = () => [
  body("chatId", "Please Enter ChatId").notEmpty(),
];

const renameGroupValidator = () => [
  param("id", "Please Enter ChatId").notEmpty(),
  body("name", "Please Enter GroupName").notEmpty(),
];

const sendFriendReqValidator = () => [
  body("userId", "Please Enter userId").notEmpty(),
];

const acceptFriendReqValidator = () => [
  body("requestId").notEmpty().withMessage("Please Enter requestId"),
  body("accept", "Please add Accept")
    .notEmpty()
    .isBoolean()
    .withMessage("Accpet  must be boolean"),
];

const adminLoginValidator = () => [
  body("secretKey", "please enter secret key").notEmpty(),
];

export {
  addMemberValidator,
  chatIdValidator,
  leaveGroupValidator,
  loginValidator,
  adminLoginValidator,
  newGroupValidator,
  registerValidator,
  removeMemberValidator,
  sendAttachmentsValidator,
  renameGroupValidator,
  sendFriendReqValidator,
  acceptFriendReqValidator,
  validateHandler,
};
