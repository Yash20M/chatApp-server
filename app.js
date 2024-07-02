import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import express from "express";
import { connectDb } from "././utils/features.js";
import errorMiddleware from "./middlewares/error.js";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import chatRouter from "./routes/chatRoute.js";
import userRouter from "./routes/userRoutes.js";
import adminRouter from "./routes/adminRouter.js";
import {
  CHAT_JOINED,
  CHAT_LEAVED,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  ONLINE_USER,
  START_TYPING,
  STOP_TYPING,
} from "./constants/events.js";
import { v4 as uuid } from "uuid";
import { getSockets } from "./lib/helper.js";
import Message from "./models/messageModel.js";
import { v2 as cloudinary } from "cloudinary";
import corsOptions from "./constants/config.js";
import { socketAutheticator } from "./middlewares/authMiddleware.js";

dotenv.config();

const mongoURI = process.env.MONGO_URI;
const port = process.env.PORT;
export const adminSecretKey = process.env.SECRETKEYADMIN;
export const envMode = process.env.NODE_ENV.trim() || "PRODUCTION";

//  Here we are getting all the users whihc are connected to socket or currently active
export const userSocketIds = new Map();
const onlineUsers = new Set();

connectDb(mongoURI);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const allowedOrigins = [
  "https://chat-app-theta-ten-31.vercel.app/",
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:4173",
];

const app = express();
const server = createServer(app);

app.use(cookieParser());
app.use(express.json());

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"],
    credentials: true,
    optionsSuccessStatus: 200,
  },
});
app.set("io", io);

app.use("/api/user", userRouter);
app.use("/api/chat", chatRouter);
app.use("/api/admin", adminRouter);

// Socket Middleware
io.use((socket, next) => {
  cookieParser()(socket.request, socket.request.res, async (err) => {
    await socketAutheticator(err, socket, next);
  });
});

app.get("/", (req, res) => {
  res.send("Hello world");
});

app.use((req, res, next) => {
  console.log(`Request Origin: ${req.headers.origin}`);
  next();
});

io.on("connection", (socket) => {
  const user = socket.user;

  userSocketIds.set(user._id.toString(), socket.id);
  // console.log("a user is connected", userSocketIds);

  // Here the event is triggering on client side for the new message
  socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
    const messageForRealTime = {
      content: message,
      _id: uuid(),
      sender: {
        _id: user._id,
        name: user.name,
      },
      chat: chatId,
      createdAt: new Date().toISOString(),
    };

    // Once a new message is added we are saving it to DB
    const messageForDB = {
      content: message,
      sender: user._id,
      chat: chatId,
    };

    const membersSocket = getSockets(members);

    // we are trigerring this so new message is created at server side
    io.to(membersSocket).emit(NEW_MESSAGE, {
      chatId,
      message: messageForRealTime,
    });

    // This event is trigger so the people who are in chat should get the mesage
    io.to(membersSocket).emit(NEW_MESSAGE_ALERT, { chatId });

    try {
      await Message.create(messageForDB);
    } catch (error) {
      throw new Error(error);
    }
  });

  socket.on(START_TYPING, ({ members, chatId }) => {
    const membersSocket = getSockets(members);

    socket.to(membersSocket).emit(START_TYPING, { chatId });
  });

  socket.on(STOP_TYPING, ({ members, chatId }) => {
    const membersSocket = getSockets(members);

    socket.to(membersSocket).emit(STOP_TYPING, { chatId });
  });

  socket.on(CHAT_JOINED, ({ userId, members }) => {
    onlineUsers.add(userId.toString());

    const membersSocket = getSockets(members);
    io.to(membersSocket).emit(ONLINE_USER, Array.from(onlineUsers));
  });

  socket.on(CHAT_LEAVED, ({ userId, members }) => {
    onlineUsers.delete(userId.toString());

    const membersSocket = getSockets(members);
    io.to(membersSocket).emit(ONLINE_USER, Array.from(onlineUsers));
  });

  socket.on("disconnect", () => {
    // Here we are deleting the user which disconnected
    userSocketIds.delete(user._id.toString());
    onlineUsers.delete(user._id.toString());
    socket.broadcast.emit(ONLINE_USER, Array.from(onlineUsers));
  });
});

app.use(errorMiddleware);

server.listen(port, () => {
  console.log(`Serve is listening on ${port} in ${process.env.NODE_ENV} mode`);
});
