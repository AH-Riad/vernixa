import { clerkClient, getAuth } from "@clerk/express";

export const auth = async (req, res, next) => {
  try {
    // ✅ Correct way to get auth data
    const { userId, has } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const hasPremiumPlan = await has({ plan: "premium" });

    const user = await clerkClient.users.getUser(userId);

    let free_usage = 0;

    if (!hasPremiumPlan && user.privateMetadata?.free_usage) {
      free_usage = user.privateMetadata.free_usage;
    } else {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          free_usage: 0,
        },
      });
    }

    req.userId = userId;
    req.plan = hasPremiumPlan ? "premium" : "free";
    req.free_usage = free_usage;

    next();
  } catch (error) {
    console.error("Auth error:", error.message);
    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};
