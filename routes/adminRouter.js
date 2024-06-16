import express from "express";
import {
  adminLogin,
  adminLogout,
  allChats,
  allMessages,
  allUsers,
  getDashboardStats,
  verifyAdmin,
} from "../controllers/adminController.js";
import { adminLoginValidator, validateHandler } from "../lib/validators.js";
import { adminOnly } from "../middlewares/authMiddleware.js";

const router = express.Router();

router
  .route("/login")
  .post(adminLoginValidator(), validateHandler, adminLogin); 
  
router.route("/logout").get(adminLogout);

// Only admin can access below
router.use(adminOnly);
router.route("/").get(verifyAdmin);
router.route("/users").get(allUsers);
router.route("/chats").get(allChats);
router.route("/messages").get(allMessages);

router.route("/stats").get(getDashboardStats);

export default router;
