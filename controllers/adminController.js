import jwt from "jsonwebtoken";
import Chat from "../models/chatModel.js";
import Message from "../models/messageModel.js";
import User from "../models/userModel.js";
import ErrorHandler from "../utils/utility.js";
import { cookieOption } from "../utils/features.js";
import { adminSecretKey } from "../app.js";

const verifyAdmin = async (req, res, next) => {
  try {
    return res.status(200).json({
      admin: true,
    });
  } catch (error) {
    next(new ErrorHandler(error));
    console.log(error);
  }
};

const adminLogin = async (req, res, next) => {
  try {
    const { secretKey } = req.body;

    const isMatch = secretKey === adminSecretKey;

    if (!isMatch) return next(new ErrorHandler("Invalid  Login", 401));

    const token = jwt.sign(adminSecretKey, process.env.JWT_SECRET);

    return res
      .status(200)
      .cookie("chatAdminToken", token, {
        ...cookieOption,
        maxAge: 1000 * 60 * 15,
      })
      .json({
        success: true,
        message: "Admin Logged in Successfully, Welcome BOSS",
      });
  } catch (error) {
    console.log(error);
    next(new ErrorHandler(error));
  }
};

const adminLogout = async (req, res, next) => {
  try {
    return res
      .status(200)
      .cookie("chatAdminToken", "", {
        ...cookieOption,
        maxAge: 0,
      })
      .json({
        success: true,
        message: "Logged out successfully",
      });
  } catch (error) {
    next(new ErrorHandler(error));
  }
};

const allUsers = async (req, res, next) => {
  try {
    const users = await User.find();

    const transformedUsers = await Promise.all(
      users.map(async ({ name, username, avatar, _id }) => {
        const [groups, friends] = await Promise.all([
          Chat.countDocuments({ groupChat: true, members: _id }),
          Chat.countDocuments({ groupChat: false, members: _id }),
        ]);

        return {
          name,
          username,
          avatar: avatar.url,
          _id,
          groups,
          friends,
        };
      })
    );

    return res.status(200).json({
      success: true,
      allUsers: transformedUsers,
    });
  } catch (error) {
    next(new ErrorHandler(error));
  }
};

const allChats = async (req, res, next) => {
  try {
    const chats = await Chat.find({})
      .populate("members", "name avatar")
      .populate("creator", "name avatar");

    const transformedChats = await Promise.all(
      chats.map(async ({ _id, groupChat, members, name, creator }) => {
        const totalMessages = await Message.countDocuments({ chat: _id });

        return {
          _id,
          groupChat,
          name,
          avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
          members: members.map(({ _id, name, avatar }) => ({
            _id,
            name,
            avatar: avatar.url,
          })),
          creator: {
            name: creator?.name || "none",
            avatar: creator?.avatar.url || "",
          },
          totalMembers: members.length,
          totalMessages,
        };
      })
    );

    return res.status(200).json({
      success: true,
      chat: transformedChats,
    });
  } catch (error) {
    next(new ErrorHandler(error));
  }
};

const allMessages = async (req, res, next) => {
  try {
    const messages = await Message.find()
      .populate("sender", "name avatar")
      .populate("chat", "groupChat");

    const transformedChats = messages.map(
      ({ _id, sender, chat, content, attachments, createdAt }) => ({
        _id,
        attachments,
        content,
        createdAt,
        sender: {
          _id: sender._id,
          name: sender.name,
          avatar: sender.avatar.url,
        },
        chat: chat?._id,
        groupChat: chat?.groupChat,
      })
    );
    return res.status(200).json({
      success: true,
      message: transformedChats,
    });
  } catch (err) {
    next(err);
  }
};

const getDashboardStats = async (req, res, next) => {
  try {
    const [groupsCount, usersCount, messagesCount, totalChatCount] =
      await Promise.all([
        Chat.countDocuments({ groupChat: true }),
        User.countDocuments(),
        Message.countDocuments(),
        Chat.countDocuments(),
      ]);

    const today = new Date();

    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const last7DaysMessages = await Message.find({
      createdAt: {
        $gte: last7Days,
        $lte: today,
      },
    }).select("createdAt");

    const messages = new Array(7).fill(0);
    const dayInMiliSecond = 1000 * 60 * 60 * 24;

    last7DaysMessages.forEach((message) => {
      const indexApprox =
        (today.getTime() - message.createdAt.getTime()) / dayInMiliSecond;

      const index = Math.floor(indexApprox);

      messages[6 - index]++;
    });

    const stats = {
      groupsCount,
      usersCount,
      messagesCount,
      totalChatCount,
      messageChart: messages,
    };

    return res.status(200).json({
      success: true,
      message: stats,
    });
  } catch (error) {
    next(new ErrorHandler(error));
  }
};

export {
  allUsers,
  allChats,
  allMessages,
  getDashboardStats,
  adminLogin,
  adminLogout,
  verifyAdmin,
};
