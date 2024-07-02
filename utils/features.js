import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import { v4 as uuid } from "uuid";
import { getBase64, getResourceType, getSockets } from "../lib/helper.js";

const connectDb = (uri) => {
  mongoose
    .connect(uri, { dbName: "ChatApp" })
    .then((data) => {
      console.log(`Connected to DB: ${data.connection.host}`);
    })
    .catch((err) => {
      throw err;
    });
};

const cookieOption = {
  maxAge: 24 * 60 * 60 * 1000,
  sameSite: "none",
  httpOnly: true,
  secure: true,
};

const sendToken = (res, user, code, message) => {
  const token = jwt.sign(
    { _id: user._id, username: user.username },
    process.env.JWT_SECRET
  );

  return res.status(code).cookie("chatapp", token, cookieOption).json({
    success: true,
    message,
    user,
  });
};

const emitEvent = (req, event, users, data) => {
  let io = req.app.get("io");
  const userSocket = getSockets(users);
  io.to(userSocket).emit(event, data);
};

const uploadFileToCloudinary = async (files = []) => {
  const uploadPromise = files.map((file) => {
    return new Promise((resolve, reject) => {
      const base64File = getBase64(file);
      const resourceType = getResourceType(file.mimetype);
      cloudinary.uploader.upload(
        base64File,
        {
          resource_type: resourceType,
          public_id: uuid(),
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
    });
  });

  try {
    const results = await Promise.all(uploadPromise);

    const formattedResult = results.map((result) => ({
      public_id: result.public_id,
      url: result.secure_url,
    }));

    return formattedResult;
  } catch (error) {
    throw new Error("Error uploading files to cloudinary>>>", error);
  }
};


export {
  connectDb,
  sendToken,
  cookieOption,
  emitEvent,
  deleteFilesFromCloud,
  uploadFileToCloudinary,
};
