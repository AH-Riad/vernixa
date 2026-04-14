import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";

import connectCloudinary from "./configs/cloudinary.js";
import aiRouter from "./routes/aiRoutes.js";
import userRouter from "./routes/userRouter.js";
import { auth } from "./middlewares/auth.js";

// ======================
// CREATE APP (MUST BE FIRST)
// ======================
const app = express();

// ======================
// INIT SERVICES
// ======================
connectCloudinary();

// ======================
// MIDDLEWARES
// ======================
app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

// ======================
// TEST ROUTES
// ======================
app.get("/", (req, res) => {
  res.send("SERVER IS LIVE!");
});

app.get("/test-grok", (req, res) => {
  res.json({
    success: true,
    message: "Server + routing working",
  });
});

// ======================
// AUTH + ROUTES
// ======================
app.use(auth);

app.use("/api/ai", aiRouter);
app.use("/api/user", userRouter);

// ======================
// START SERVER
// ======================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
