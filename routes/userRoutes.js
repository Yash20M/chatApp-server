import express from "express";
import {
  acceptFriendRequest,
  getAllNotifications,
  getMyFriends,
  getMyProfile,
  login,
  logoutUser,
  register,
  searchUser,
  sendFriendRequest,
} from "../controllers/userController.js";
import { singleAvatar } from "../middlewares/multer.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  acceptFriendReqValidator,
  loginValidator,
  registerValidator,
  sendFriendReqValidator,
  validateHandler,
} from "../lib/validators.js";
const router = express.Router();

// Before Login Routes
router
  .route("/new")
  .post(singleAvatar, registerValidator(), validateHandler, register);
router.route("/login").post(loginValidator(), validateHandler, login);

// This routes are acccessible after login only
router.use(authMiddleware);

router.route("/me").get(getMyProfile);
 
router.route("/logout").get(logoutUser);

router.route("/search").get(searchUser);

router
  .route("/sendrequest")
  .put(sendFriendReqValidator(), validateHandler, sendFriendRequest);

router
  .route("/acceptrequest")
  .put(acceptFriendReqValidator(), validateHandler, acceptFriendRequest);

router.route("/notifications").get(getAllNotifications);

router.route("/friends").get(getMyFriends);

export default router;
