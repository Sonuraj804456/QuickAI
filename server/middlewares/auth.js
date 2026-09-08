import { clerkClient } from "@clerk/express";

export const auth = async (req, res, next) => {
  try {
    const { userId, has } = await req.auth();
    const clerkHasPremium = await has({ plan: "premium" });
    const user = await clerkClient.users.getUser(userId);
    const hasPremiumPlan = clerkHasPremium || user.publicMetadata?.plan === "premium";

    if (!hasPremiumPlan && user.privateMetadata?.free_usage !== undefined) {
      req.free_usage = user.privateMetadata.free_usage;
    } else {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          free_usage: user.privateMetadata?.free_usage ?? 0
        }
      });
      req.free_usage = user.privateMetadata?.free_usage ?? 0;
    }

    req.plan = hasPremiumPlan ? "premium" : "free";
    next();

  } catch (error) {
    res.json({
      success: false,
      message: error.message
    });
  }
};
