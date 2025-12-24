import express from "express";
import {
  signUp,
  login,
  getProfile,
} from "../controllers/userController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/signup", signUp);
router.post("/login", login);
router.get("/profile", protect, getProfile);

export default router;




