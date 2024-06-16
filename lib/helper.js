import { userSocketIds } from "../app.js";

export const getAllOtherMembers = (members, userId) => {
  return members.find((member) => member._id.toString() !== userId.toString());
};

export const getSockets = (users = []) => {
  const sockets = users.map((user) => userSocketIds.get(user.toString()));

  return sockets;
};

export const getBase64 = (file) =>
  `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

export const getResourceType = (mimetype) => {
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("video/")) return "video";
  if (mimetype.startsWith("audio/")) return "audio";
  return "raw"; // For documents and other files
};
