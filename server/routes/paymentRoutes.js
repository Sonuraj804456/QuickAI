import express from "express";
import { auth } from "../middlewares/auth.js";
import {
  createCheckoutSession,
  createPortalSession,
  getPaymentStatus
} from "../controllers/paymentController.js";

const paymentRouter = express.Router();

paymentRouter.post("/create-checkout-session", auth, createCheckoutSession);
paymentRouter.post("/create-portal-session", auth, createPortalSession);
paymentRouter.get("/status", auth, getPaymentStatus);

export default paymentRouter;
