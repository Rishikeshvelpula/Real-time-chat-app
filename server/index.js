const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");
const socketIO = require("socket.io");
require("dotenv").config();

const app = express();

/**
 * ✅ IMPORTANT:
 * Do NOT include trailing slash in origins.
 */
const allowedOrigins = [
  "http://localhost:3000",
  "https://real-time-chat-app-ten-rosy.vercel.app", // ✅ no trailing slash
];

/**
 * ✅ CORS for REST APIs
 */
app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS blocked: " + origin), false);
    },
    credentials: true,
  })
);

app.use(express.json());

/**
 * ✅ MongoDB connection
 */
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("DB Connection Successful"))
  .catch((err) => console.log("DB Error:", err.message));

/**
 * ✅ Optional root route so Render doesn't show "Cannot GET /"
 */
app.get("/", (_req, res) => {
  res.send("Chat API is running ✅");
});

app.get("/ping", (_req, res) => {
  return res.json({ msg: "Ping Successful" });
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

/**
 * ✅ Render provides PORT automatically
 */
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`Server started on ${PORT}`));

/**
 * ✅ Socket.io with CORS
 */
const io = socketIO(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

global.onlineUsers = new Map();

io.on("connection", (socket) => {
  // console.log("Socket connected:", socket.id);

  socket.on("add-user", (userId) => {
    global.onlineUsers.set(userId, socket.id);
  });

  socket.on("send-msg", (data) => {
    const sendUserSocket = global.onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("msg-recieve", data.msg);
    }
  });

  socket.on("disconnect", () => {
    // optional cleanup
    for (const [userId, socketId] of global.onlineUsers.entries()) {
      if (socketId === socket.id) {
        global.onlineUsers.delete(userId);
        break;
      }
    }
  });
});
