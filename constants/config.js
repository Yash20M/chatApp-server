const corsOptions = {
  origin: [
    process.env.CLIENT_URL,
    "http://localhost:5173",
    "http://localhost:4173",
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"],
  credentials: true,
  optionsSuccessStatus: 200,
};

export const chatAppToken = "chatapp";

export default corsOptions;
