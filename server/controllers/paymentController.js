import stripe from "../configs/stripe.js";
import { clerkClient } from "@clerk/express";

/**
 * Creates a Stripe Checkout Session for upgrading to the Premium Plan
 */
export const createCheckoutSession = async (req, res) => {
  try {
    const { userId } = req.auth();

    if (!stripe) {
      return res.status(500).json({
        success: false,
        message: "Stripe is not configured. Please set STRIPE_SECRET_KEY in server environment variables."
      });
    }

    const user = await clerkClient.users.getUser(userId);
    const userEmail = user.emailAddresses?.[0]?.emailAddress;

    const origin = req.headers.origin || process.env.CLIENT_URL || "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: process.env.CURRENCY || "usd",
            product_data: {
              name: "QuickAI Premium Plan",
              description: "Unlimited AI generations, Image Creation, Object/Background Removal, and Resume Reviews."
            },
            unit_amount: 1900, // $19.00/month
            recurring: {
              interval: "month"
            }
          },
          quantity: 1
        }
      ],
      client_reference_id: userId,
      customer_email: userEmail,
      metadata: {
        userId
      },
      subscription_data: {
        metadata: {
          userId
        }
      },
      success_url: `${origin}/ai?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/ai?payment=cancel`
    });

    res.json({
      success: true,
      url: session.url
    });
  } catch (error) {
    console.error("Error creating checkout session:", error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Stripe Webhook Handler to process payment events
 */
export const stripeWebhook = async (req, res) => {
  if (!stripe) {
    return res.status(500).send("Stripe is not configured");
  }

  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      // Allow parsed or string body when webhook secret is not yet configured for local testing
      event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      console.warn("⚠️ Warning: Stripe webhook secret not provided. Skipping signature verification.");
    }
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata?.userId;

        if (userId) {
          await clerkClient.users.updateUserMetadata(userId, {
            publicMetadata: {
              plan: "premium",
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
              upgradedAt: new Date().toISOString()
            }
          });
          console.log(`✅ User ${userId} upgraded to Premium successfully via Stripe!`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;

        if (userId) {
          await clerkClient.users.updateUserMetadata(userId, {
            publicMetadata: {
              plan: "free",
              stripeSubscriptionId: null,
              downgradedAt: new Date().toISOString()
            }
          });
          console.log(`ℹ️ User ${userId} subscription cancelled, downgraded to Free.`);
        }
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Error processing Stripe webhook:", error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Creates a Stripe Customer Portal session so users can manage their subscription
 */
export const createPortalSession = async (req, res) => {
  try {
    const { userId } = req.auth();

    if (!stripe) {
      return res.status(500).json({
        success: false,
        message: "Stripe is not configured."
      });
    }

    const user = await clerkClient.users.getUser(userId);
    const customerId = user.publicMetadata?.stripeCustomerId;

    if (!customerId) {
      return res.json({
        success: false,
        message: "No active Stripe customer billing profile found for this account."
      });
    }

    const origin = req.headers.origin || process.env.CLIENT_URL || "http://localhost:5173";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/ai`
    });

    res.json({
      success: true,
      url: portalSession.url
    });
  } catch (error) {
    console.error("Error creating portal session:", error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Returns current payment & subscription status of the authenticated user
 */
export const getPaymentStatus = async (req, res) => {
  try {
    const { userId } = req.auth();
    const user = await clerkClient.users.getUser(userId);

    res.json({
      success: true,
      plan: req.plan,
      free_usage: req.free_usage,
      stripeCustomerId: user.publicMetadata?.stripeCustomerId || null,
      stripeSubscriptionId: user.publicMetadata?.stripeSubscriptionId || null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
