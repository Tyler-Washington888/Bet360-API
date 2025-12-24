import express from "express";
import {
  updateSubscription,
  getSubscriptionStatus,
} from "../controllers/subscriptionController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();


router.post("/update", updateSubscription);


router.get("/:email", protect, getSubscriptionStatus);

export default router;

