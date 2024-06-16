import ErrorHandler from "../utils/utility.js";
import Chat from "../models/chatModel.js";
import {
  deleteFilesFromCloud,
  emitEvent,
  uploadFileToCloudinary,
} from "../utils/features.js";
import {
  ALERT,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  REFETCH_CHATS,
} from "../constants/events.js";
import { getAllOtherMembers } from "../lib/helper.js";
import User from "../models/userModel.js";
import Message from "../models/messageModel.js";

const newGroupChat = async (req, res, next) => {
  try {
    const { name, members } = req.body;

    if (members.length < 2)
      return next(new ErrorHandler("Group chat must have at least 3 members"));

    //   Here we have added  members (...meembers and req.userId is us (self))
    const allMembers = [...members, req.userId];

    await Chat.create({
      name,
      groupChat: true,
      creator: req.userId,
      members: allMembers,
    });

    // This event is to tell every one that who had joined the group
    emitEvent(req, ALERT, allMembers, `Welcome to ${name} group`);

    //  This event is used to fetch the chats
    emitEvent(req, REFETCH_CHATS, members);

    res.status(201).json({
      success: true,
      message: `Group Named:${name} is created Successfully`,
    });
  } catch (error) {
    next(error);
  }
};

const getMyChats = async (req, res, next) => {
  try {
    const chats = await Chat.find({ members: req.userId }).populate(
      "members",
      "name avatar"
    );

    const transformedChats = chats.map(({ _id, name, groupChat, members }) => {
      const otherMember = getAllOtherMembers(members, req.userId);

      return {
        _id: _id,
        avatar: groupChat
          ? members.slice(0, 3).map(({ avatar }) => {
              return avatar.url;
            })
          : [otherMember.avatar.url],
        name: groupChat ? name : otherMember.name,
        groupChat: groupChat,
        members: members.reduce((prev, curVal) => {
          if (curVal._id.toString() !== req.userId.toString()) {
            prev.push(curVal._id);
          }
          return prev;
        }, []),
      };
    });

    return res.status(200).json(transformedChats);
  } catch (error) {
    next(error);
  }
};

const getMyGroups = async (req, res, next) => {
  try {
    const chats = await Chat.find({
      members: req.userId,
      groupChat: true,
    }).populate("members", "name avatar");

    const groups = chats.map(({ members, _id, groupChat, name }) => ({
      _id,
      groupChat,
      name,
      avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
    }));

    return res.status(200).json(groups);
  } catch (error) {
    next(error);
  }
};

const addMembers = async (req, res, next) => {
  try {
    const { chatId, members } = req.body;

    const chats = await Chat.findById(chatId);

    if (!chats) return new ErrorHandler("Chat cannot found", 404);

    if (!chats.groupChat) new ErrorHandler("This is not a group chat", 404);

    if (chats.creator.toString() !== req.userId.toString())
      return next(new ErrorHandler("Only creator can add members", 403));

    const allNewMembersPromise = members.map((member) => {
      return User.findById(member, "name");
    });

    const allMembers = await Promise.all(allNewMembersPromise);

    const uniqueMembers = allMembers
      .filter((member) => {
        return !chats.members.includes(member._id.toString());
      })
      .map((member) => member._id);

    chats.members.push(...uniqueMembers);

    if (chats.members.length > 100)
      return next(new ErrorHandler("Members limit exceeds upto 100"));

    const allUsersName = allMembers
      .map((newMembers) => newMembers.name)
      .join(",");

    emitEvent(
      req,
      ALERT,
      chats.members,
      `${allUsersName} have been added to the ${chats.name} group by ${req.username}`
    );

    emitEvent(req, REFETCH_CHATS, chats.members);

    await chats.save();
    return res.status(200).json({
      success: true,
      message: `${allUsersName} have been added to the group sucessfully`,
    });
  } catch (error) {
    next(error);
  }
};

const removeMember = async (req, res, next) => {
  try {
    const { chatId, userId } = req.body;

    const [chat, removedUser] = await Promise.all([
      Chat.findById(chatId),
      User.findById(userId),
    ]);

    if (!chat) return new ErrorHandler("Chat cannot found", 404);

    if (!chat.groupChat) new ErrorHandler("This is not a group chat", 404);

    if (chat.creator.toString() !== req.userId.toString())
      return next(new ErrorHandler("Only creator can remove members", 403));

    if (chat.members.length <= 3)
      return next(new ErrorHandler("Group must have atleast 3 members"));

    const allChatMembers = chat.members.map((member) => member.toString());

    chat.members = chat.members.filter(
      (member) => member._id.toString() !== userId.toString()
    );

    await chat.save();

    emitEvent(req, ALERT, chat.members, {
      message: `${removedUser.name} has removed from the group`,
      chatId,
    });

    emitEvent(req, REFETCH_CHATS, allChatMembers);

    return res.status(200).json({
      success: true,
      message: `${removedUser.name} has removed from the group successfully`,
    });
  } catch (error) {
    next(error);
  }
};

const leaveGroup = async (req, res, next) => {
  try {
    const chatId = req.params.id;

    const chat = await Chat.findById(chatId);

    if (!chat) return next(new ErrorHandler("Chat not found", 404));

    const remainingMember = chat.members.filter(
      (member) => member.toString() !== req.userId.toString()
    );

    if (remainingMember.length < 3)
      return next(new ErrorHandler("Group must have atleast 3 members"));

    if (chat.creator.toString() === req.userId.toString()) {
      const random = Math.round(Math.random() * remainingMember.length);

      const newCreator = remainingMember[random];
      chat.creator = newCreator;
    }
    chat.members = remainingMember;

    const [user] = await Promise.all([
      User.findById(req.userId, "name"),
      await chat.save(),
    ]);

    emitEvent(req, ALERT, chat.members, {
      chatId,
      mesage: `${user.name} has left the group`,
    });

    emitEvent(req, REFETCH_CHATS, chat.members);

    return res.status(200).json({
      success: true,
      message: `${user.name} has left the group`,
    });
  } catch (err) {
    next(new ErrorHandler(err));
  }
};

// Send Attachments
const sendAttachment = async (req, res, next) => {
  try {
    const { chatId } = req.body;

    const files = req.files || [];
    if (files.length < 1) {
      return next(new ErrorHandler("PLease upload attachment", 400));
    }

    if (files.length > 5)
      return next(new ErrorHandler("You can add onlu upto 5 files"));

    const [chat, user] = await Promise.all([
      Chat.findById(chatId),
      User.findById(req.userId, "name"),
    ]);

    if (!chat) return next(new ErrorHandler("Chat not found", 404));

    if (files.length < 1)
      return next(new ErrorHandler("Please provide attachments", 400));

    // upload files here
    const attachments = await uploadFileToCloudinary(files);

    const messageForDb = {
      content: "",
      attachments,
      sender: user._id,
      chat: chatId,
    };

    const messageForRealTime = {
      ...messageForDb,
      sender: {
        _id: user._id,
        name: user.name,
      },
    };

    const message = await Message.create(messageForDb);

    emitEvent(req, NEW_MESSAGE, chat.members, {
      message: messageForRealTime,
      chatId,
    });

    emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId });

    return res.status(200).json({
      success: true,
      message: message,
    });
  } catch (error) {
    next(error);
  }
};

const getChatDetials = async (req, res, next) => {
  try {
    if (req.query.populate === "true") {
      const chat = await Chat.findById(req.params.id)
        .populate("members", "name avatar")
        .lean();

      if (!chat) return next(new ErrorHandler("Chat not found", 404));

      chat.members = chat.members.map(({ _id, name, avatar }) => ({
        _id,
        name,
        avatar: avatar.url,
      }));

      return res.status(200).json({
        success: true,
        chat,
      });
    } else {
      const chat = await Chat.findById(req.params.id);

      if (!chat) return next(new ErrorHandler("Chat not found", 404));

      return res.status(200).json({
        success: true,
        chat,
      });
    }
  } catch (error) {
    next(error);
  }
};

const renameGroup = async (req, res, next) => {
  try {
    const chatId = req.params.id;
    const { name } = req.body;
    console.log("rename>>", name);
    const chat = await Chat.findById(chatId);

    if (!chat.groupChat)
      return next(new ErrorHandler("This is not  groupchat", 400));

    if (chat.creator.toString() !== req.userId.toString()) {
      return next(new ErrorHandler("Only admin can change the name"));
    }

    chat.name = name;

    await chat.save();

    emitEvent(req, REFETCH_CHATS, chat.members);
    return res.status(200).json({
      success: true,
      message: `Group name changed, set to ${name}`,
    });
  } catch (error) {
    next(error);
  }
};

const deleteChat = async (req, res, next) => {
  try {
    const chatId = req.params.id;

    const chat = await Chat.findById(chatId);

    if (!chat) return next(new ErrorHandler("Chat not found", 404));
    const members = chat.members;

    if (chat.groupChat && chat.creator.toString() !== req.userId.toString())
      return next(
        new ErrorHandler(
          "You are not allowed to delete the chat,you are not admin",
          403
        )
      );

    if (chat.groupChat && !chat.members.includes(req.userId.toString()))
      return next(
        new ErrorHandler(
          "You are not allowed to delete the chat, you are not in group",
          403
        )
      );

    // here we have to delete all the messages as weel as attachments or files from cloudinary
    const messagesWithAttachements = await Message.find({
      chat: chatId,
      attachments: { $exists: true, $ne: [] },
    });

    const public_ids = [];

    messagesWithAttachements.forEach(({ attachments }) =>
      attachments.forEach((attachment) => public_ids.push(attachment.public_id))
    );

    await Promise.all([
      // delete files from cloudinary
      deleteFilesFromCloud(public_ids),
      chat.deleteOne(),
      Message.deleteMany({ chat: chatId }),
    ]);

    emitEvent(req, REFETCH_CHATS, members);

    return res.status(200).json({
      success: true,
      message: "Chat deleted Successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Get messages
const getMessages = async (req, res, next) => {
  try {
    const chatId = req.params.id;
    const { page = 1 } = req.query;

    const limit = 20;
    const skip = (page - 1) * limit;

    const chat = await Chat.findById(chatId);
    if (!chat) return next(new ErrorHandler("Chat not found", 404));

    if (!chat.members.includes(req.userId.toString())) {
      return next(new ErrorHandler("You cannot access this chat", 404));
    }

    const [messages, totalMessagesCount] = await Promise.all([
      Message.find({ chat: chatId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("sender", "name")
        .lean(),
      Message.countDocuments({ chat: chatId }),
    ]);

    const totalPages = Math.ceil(totalMessagesCount / limit);

    return res.status(200).json({
      success: true,
      message: messages.reverse(),
      totalPages,
    });
  } catch (error) {
    next(error);
  }
};

export {
  newGroupChat,
  getMyChats,
  getMyGroups,
  addMembers,
  removeMember,
  leaveGroup,
  sendAttachment,
  getChatDetials,
  renameGroup,
  deleteChat,
  getMessages,
};
