import express from "express";
import cors from "cors";
import "dotenv/config";
import { clerkMiddleware,requireAuth } from '@clerk/express'
import aiRouter from "./routes/aiRoutes.js";
import connectCloudinary from "./configs/cloudinary.js";
import userRouter from "./routes/userRoutes.js";
import paymentRouter from "./routes/paymentRoutes.js";
import ragRouter from "./routes/ragRoutes.js";
import { stripeWebhook } from "./controllers/paymentController.js";

const app = express();

await connectCloudinary();

app.use(cors());

// Stripe Webhook must receive raw body and precede express.json() & requireAuth()
app.post(
  "/api/payment/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

app.use(express.json());
app.use(clerkMiddleware());

app.get("/", (req, res) => res.send("Server is Live!"));

app.use(requireAuth());

app.use('/api/ai', aiRouter);
app.use('/api/user', userRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/rag', ragRouter);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server is running on port", PORT);
});
