import { clerkClient } from "@clerk/express";

export const auth = async (req, res, next) => {
  try {
    // Get user info from Clerk
    const { userId, has } = await req.auth();

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const hasPremiumPlan = await has({ plan: "premium" });
    const user = await clerkClient.users.getUser(userId);

    // Set free usage for non-premium users
    if (!hasPremiumPlan && user.privateMetadata?.free_usage) {
      req.free_usage = user.privateMetadata.free_usage;
    } else {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: { free_usage: 0 },
      });
      req.free_usage = 0;
    }

    // **Set userId** for downstream controllers
    req.userId = userId;
    req.plan = hasPremiumPlan ? "premium" : "free";

    next();
  } catch (error) {
    res.status(401).json({ success: false, message: error.message });
  }
};
