import bcrypt from "bcryptjs";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.js";
import { getAllOtherMembers } from "../lib/helper.js";
import Chat from "../models/chatModel.js";
import Request from "../models/requestModel.js";
import User from "../models/userModel.js";
import {
  cookieOption,
  emitEvent,
  sendToken,
  uploadFileToCloudinary,
} from "../utils/features.js";
import ErrorHandler from "../utils/utility.js";

const register = async (req, res, next) => {
  try {
    const { name, username, password, bio } = req.body;
    const file = req.file;

    if (!file) return next(new ErrorHandler("Please upload avatar"));

    const result = await uploadFileToCloudinary([file]);

    const avatar = {
      public_id: result[0].public_id,
      url: result[0].url,
    };

    const user = await User.create({ name, username, bio, password, avatar });

    //   Send token taking 4 argument - response,user,status,message
    sendToken(res, user, 201, "userCreated");
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const userExists = await User.findOne({ username }).select("+password");

    if (!userExists) {
      return next(new ErrorHandler("Invlaid Login", 400));
    }

    const isMatch = await bcrypt.compare(password, userExists.password);

    if (!isMatch) return next(new ErrorHandler("Invlaid Login", 400));

    sendToken(res, userExists, 200, `Welcome Back ${userExists.username}`);
  } catch (error) {
    new ErrorHandler(error);
  }
};


const getMyProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      // If user is not found, send an error response
      return next(new ErrorHandler("User not found", 404));
    }

    return res.status(200).json(user);
  } catch (error) {
    // Pass the error to the error handling middleware
    next(error);
  }
};

const logoutUser = async (req, res) => {
  try {
    return res
      .status(200)
      .cookie("chatapp", "", { ...cookieOption, maxAge: 0 })
      .json({
        success: true,
        message: "Logged out successfull",
      });
  } catch (error) {}
};

const searchUser = async (req, res, next) => {
  try {
    const { name } = req.query;

    // Finding all chats
    const myChats = await Chat.find({ members: req.userId, groupChat: false });

    // All Users from mychats means friends or people i have chatted with
    const allUsersFromMyChat = myChats.map((chat) => chat.members).flat();

    // Finding all other users expect me and my Friends(memebrs)
    const allUsersExpectMeAndFriend = await User.find({
      _id: { $nin: allUsersFromMyChat },
      name: { $regex: name, $options: "i" },
    });

    // Modified the response
    const users = allUsersExpectMeAndFriend.map(({ _id, name, avatar }) => ({
      _id,
      name,
      avatar: avatar.url,
    }));

    return res.status(200).json({ message: users });
  } catch (error) {
    next(error);
    console.log(error);
  }
};

const sendFriendRequest = async (req, res, next) => {
  try {
    const { userId } = req.body;

    const request = await Request.findOne({
      $or: [
        { sender: req.userId, reciever: userId },
        { sender: userId, reciever: req.userId },
      ],
    });

    if (request) return next(new ErrorHandler("Request already sent"));

    await Request.create({
      sender: req.userId,
      reciever: userId,
    });

    emitEvent(req, NEW_REQUEST, [userId], "request");

    return res.status(201).json({
      success: true,
      message: "Friend Request Send Successfully",
    });
  } catch (error) {
    next(error);
  }
};

const acceptFriendRequest = async (req, res, next) => {
  try {
    const { requestId, accept } = req.body;

    const request = await Request.findById(requestId)
      .populate("sender", "name")
      .populate("reciever", "name");

    if (!request) return next(new ErrorHandler("Request not Found", 404));

    if (request.reciever._id.toString() !== req.userId.toString())
      return next(
        new ErrorHandler("You are not authorized to accpet this request", 401)
      );

    if (!accept) {
      await request.deleteOne();
      return res.status(200).json({
        success: true,
        message: "Friend Request Rejected!!",
      });
    }

    const members = [request.sender._id, request.reciever._id];

    await Promise.all([
      Chat.create({
        members,
        name: `${request.sender.name} - ${request.reciever.name}`,
      }),
      await request.deleteOne(),
    ]);

    emitEvent(req, REFETCH_CHATS, members);

    return res.status(200).json({
      success: true,
      message: "Friend Request accepeted!!",
      senderId: request.sender._id,
    });
  } catch (error) {
    next(error);
  }
};

const getAllNotifications = async (req, res, next) => {
  try {
    const request = await Request.find({ reciever: req.userId }).populate(
      "sender",
      "name avatar"
    );

    const allRequest = request.map(({ _id, sender }) => ({
      _id,
      sender: {
        _id: sender._id,
        name: sender.name,
        avatar: sender.avatar.url,
      },
    }));

    return res.status(200).json({
      success: true,
      message: allRequest,
    });
  } catch (error) {
    next(error);
  }
};

const getMyFriends = async (req, res, next) => {
  try {
    const chatId = req.query.chatId;

    const chat = await Chat.find({
      members: req.userId,
      groupChat: false,
    }).populate("members", "name avatar");

    const friends = chat.map(({ members }) => {
      const otherUser = getAllOtherMembers(members, req.userId);

      return {
        _id: otherUser._id,
        name: otherUser.name,
        avatar: otherUser.avatar.url,
      };
    });
    if (chatId) {
      const chat = await Chat.findById(chatId);

      const availableFriend = friends.filter((friend) =>
        !chat.members.includes(friend._id)
      );

      return res.status(200).json({
        success: true,
        friends: availableFriend,
      });
    } else {
      return res.status(200).json({
        success: true,
        friends,
      });
    }
  } catch (err) {
    next(new ErrorHandler(err));
  }
};

export {
  acceptFriendRequest,
  getAllNotifications,
  getMyFriends, getMyProfile, login, logoutUser, register, searchUser,
  sendFriendRequest
};

