import express from "express";
import cors from "cors";
import "dotenv/config";
import { clerkMiddleware, requireAuth, clerkClient } from "@clerk/express";
import aiRouter from "./routes/aiRoutes.js";
import connectCloudinary from "./configs/cloudinary.js";
import userRouter from "./routes/userRouter.js";

const app = express();

// Properly initialize Cloudinary
connectCloudinary();

app.use(cors());
app.use(express.json());

// Clerk middleware
app.use(clerkMiddleware());

// Test route
app.get("/", (req, res) => res.send("SERVER IS LIVE!"));

// Require authentication for all routes after this
app.use(requireAuth());
app.use("/api/ai", aiRouter);
app.use("/api/user", userRouter);

// ✅ Do NOT call app.listen() on Vercel
// Instead, export app
export default app;

// ✅ Keep your custom middleware
export const auth = async (req, res, next) => {
  try {
    const { userId, has } = await req.auth();
    const hasPremiumPlan = await has({ plan: "premium" });
    const user = await clerkClient.users.getUser(userId);

    if (!hasPremiumPlan && user.privateMetadata?.free_usage) {
      req.free_usage = user.privateMetadata.free_usage;
    } else {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          free_usage: 0,
        },
      });
      req.free_usage = 0;
    }
    req.userId = userId;
    req.plan = hasPremiumPlan ? "premium" : "free";

    next();
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
