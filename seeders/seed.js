import Chat from "../models/chatModel.js";
import User from "../models/userModel.js";
import Message from "../models/messageModel.js";

import { faker, simpleFaker } from "@faker-js/faker";

const createUser = async (numUsers) => {
  try {
    const usersPromise = [];

    for (let i = 0; i < numUsers; i++) {
      const tempUser = User.create({
        name: faker.person.fullName(),
        username: faker.internet.userName(),
        bio: faker.lorem.sentence(10),
        password: "password",
        avatar: {
          public_id: faker.system.fileName(),
          url: faker.image.avatar(),
        },
      });
      usersPromise.push(tempUser);
    }
    await Promise.all(usersPromise);
    console.log("Users Created>>>", numUsers);
    process.exit(1);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

const createSingleChats = async (chatsCount) => {
  try {
    const users = await User.find().select("_id");

    const chatPromise = [];

    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        chatPromise.push(
          Chat.create({
            name: faker.lorem.words(2),
            members: [users[i], users[j]],
          })
        );
      }
    }
    await Promise.all(chatPromise);

    console.log("Chats created seeders");
    process.exit(1);
  } catch (error) {
    console.log(error);
  }
};
const createGroupChats = async (chatsCount) => {
  try {
    const users = await User.find().select("_id");

    const chatPromsie = [];

    for (let i = 0; i < chatsCount; i++) {
      const numMembers = simpleFaker.number.int({ min: 3, max: users.length });

      const members = [];

      for (let i = 0; i < numMembers; i++) {
        const randomIndex = Math.floor(Math.random() * users.length);
        const randomUser = users[randomIndex];

        if (!members.includes(randomUser)) {
          members.push(randomUser);
        }
      }

      const chat = await Chat.create({
        groupChat: true,
        name: faker.lorem.words(1),
        members,
        creator: members[0],
      });
      chatPromsie.push(chat);
    }

    await Promise.all(chatPromsie);
    console.log("Chats created Succesfully");
    process.exit(1);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

const createMessage = async (numMessage) => {
  try {
    const user = await User.find().select("_id");
    const chat = await Chat.find().select("_id");

    const messagPromise = [];

    for (let i = 0; i < numMessage; i++) {
      const randomUser = user[Math.floor(Math.random() * user.length)];
      const randomChat = chat[Math.floor(Math.random() * user.length)];

      messagPromise.push(
        Message.create({
          chat: randomChat,
          sender: randomUser,
          content: faker.lorem.sentence(),
        })
      );
    }

    await Promise.all(messagPromise);
    console.log("Messages created successfully");
    process.exit(1);
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};

const createMessagesInChat = async (chatId, numMessage) => {
  try {
    const users = await User.find().select("_id");

    const messagesPromise = [];

    for (let i = 0; i < numMessage; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];

      messagesPromise.push(
        Message.create({
          chat: chatId,
          sender: randomUser,
          content: faker.lorem.sentence(),
        })
      );
    }
    await Promise.all(messagesPromise);
    console.log("Message created successfully");
    process.exit(1);
  } catch (err) {
    {
      console.log(err);
      process.exit(1);
    }
  }
};

export {
  createUser,
  createGroupChats,
  createSingleChats,
  createMessage,
  createMessagesInChat,
};
