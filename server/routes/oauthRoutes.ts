import express from "express";
import {
  exchangeToken,
  getTokenStatus,
  refreshToken,
  revokeToken,
  unsubscribe,
} from "../controllers/oauthController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/exchange", protect, exchangeToken);
router.get("/status/:sportsbook", protect, getTokenStatus);
router.post("/refresh/:sportsbook", protect, refreshToken);
router.post("/revoke/:sportsbook", protect, revokeToken);
router.post("/unsubscribe/:sportsbook", protect, unsubscribe);

export default router;

