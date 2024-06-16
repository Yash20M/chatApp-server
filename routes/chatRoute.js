import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  addMembers,
  deleteChat,
  getChatDetials,
  getMessages,
  getMyChats,
  getMyGroups,
  leaveGroup,
  newGroupChat,
  removeMember,
  renameGroup,
  sendAttachment,
} from "../controllers/chatController.js";
import { attachmentMulter } from "../middlewares/multer.js";
import {
  addMemberValidator,
  chatIdValidator,
  leaveGroupValidator,
  newGroupValidator,
  removeMemberValidator,
  renameGroupValidator,
  sendAttachmentsValidator,
  validateHandler,
} from "../lib/validators.js";

const router = express.Router();

router.use(authMiddleware);
router.route("/new").post(newGroupValidator(), validateHandler, newGroupChat);
router.route("/mychats").get(getMyChats);
router.route("/mygroups").get(getMyGroups);
router
  .route("/addmembers")
  .patch(addMemberValidator(), validateHandler, addMembers);
router
  .route("/removemember")
  .patch(removeMemberValidator(), validateHandler, removeMember);
router
  .route("/leavegroup/:id")
  .delete(leaveGroupValidator(), validateHandler, leaveGroup);

// Send attachment
router
  .route("/message")
  .post(
    attachmentMulter,
    sendAttachmentsValidator(),
    validateHandler,
    sendAttachment
  );

// Get Messages
router
  .route("/message/:id")
  .get(chatIdValidator(), validateHandler, getMessages);

router
  .route("/:id") 
  .get(chatIdValidator(), validateHandler, getChatDetials)
  .put(renameGroupValidator(), validateHandler, renameGroup)
  .delete(chatIdValidator(), validateHandler , deleteChat);

export default router;
