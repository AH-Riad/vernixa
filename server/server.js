import express from "express";
import cors from "cors";
import "dotenv/config";
import { clerkMiddleware, requireAuth } from "@clerk/express";

const app = express();

app.use(cors());
app.use(express.json());

app.use(clerkMiddleware());

app.get("/", (req, res) => res.send("SERVER IS LIVE!"));

app.use(requireAuth());

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("App is listening on port", PORT);
});
//middleware to check userId and premium plan
import { clerkClient } from "@clerk/express";
import { preinit } from "react-dom";

export const auth = async (req, res, next) => {
  try {
    const { userId, has } = await req.auth();
    const hasPremiumPlan = await has({ plan: "premium" });
    const user = await clerkClient.users.getUser(userId);

    if (!hasPremiumPlan && user.privateMedata.free_usage) {
      req.free_usage = user.privateMedata.free_usage;
    } else {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMedata: {
          free_usage: 0,
        },
      });
      req.free_usage = 0;
    }
    req.plan = hasPremiumPlan ? "premium" : "free";
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
