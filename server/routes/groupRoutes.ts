import express from "express";
import { protect } from "../middleware/authMiddleware";
import {
  createGroup,
  getMyGroups,
  getGroupById,
  inviteUser,
  getMyInvites,
  respondToInvite,
  searchUsers,
  updateGroupName,
  removeInvite,
  leaveGroup,
  transferOwnership,
  deactivateGroup,
} from "../controllers/groupController";

const router = express.Router();

router.post("/", protect, createGroup);
router.get("/", protect, getMyGroups);
router.get("/invites", protect, getMyInvites);
router.get("/search-users", protect, searchUsers);
router.post("/respond-invite", protect, respondToInvite);
router.put("/:id/name", protect, updateGroupName);
router.post("/:id/invite", protect, inviteUser);
router.delete("/:id/invite", protect, removeInvite);
router.post("/:id/leave", protect, leaveGroup);
router.post("/:id/transfer", protect, transferOwnership);
router.delete("/:id", protect, deactivateGroup);
router.get("/:id", protect, getGroupById);

export default router;

