import express from "express";
import cors from "cors";
import "dotenv/config";
import { clerkMiddleware, requireAuth, clerkClient } from "@clerk/express";
import aiRouter from "./routes/aiRoutes.js";
import connectCloudinary from "./configs/cloudinary.js";

const app = express();
await connectCloudinary;

app.use(cors());
app.use(express.json());

app.use(clerkMiddleware());

app.get("/", (req, res) => res.send("SERVER IS LIVE!"));

// Require authentication for all routes after this
app.use(requireAuth());
app.use("/api/ai", aiRouter);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("App is listening on port", PORT);
});

// middleware to check userId and premium plan
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
    req.plan = hasPremiumPlan ? "premium" : "free";
    next();
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
