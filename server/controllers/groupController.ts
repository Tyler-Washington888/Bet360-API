import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Group, { IGroupDocument } from "../models/groupModel";
import User from "../models/userModel";
import { AuthenticatedRequest } from "../interfaces/user";
import mongoose from "mongoose";

interface CreateGroupRequest {
  name: string;
  imageUrl?: string;
}

interface InviteUserRequest {
  username: string;
}

interface RespondToInviteRequest {
  groupId: string;
  action: "accept" | "deny";
}

// Helper function to ensure imageUrl is always included in group responses
const ensureImageUrl = (group: any) => {
  return {
    ...group,
    imageUrl: group?.imageUrl || null,
  };
};

const createGroup = asyncHandler(async (req: Request, res: Response) => {
  const typedReq = req as AuthenticatedRequest;
  const { name, imageUrl }: CreateGroupRequest = req.body;

  if (!name || name.trim().length === 0) {
    res.status(400);
    throw new Error("Group name is required");
  }

  if (name.length > 100) {
    res.status(400);
    throw new Error("Group name cannot exceed 100 characters");
  }

  // Prepare group data - include imageUrl if provided (even if empty string, convert to undefined)
  const groupData: any = {
    name: name.trim(),
    admin: typedReq.user._id,
    members: [
      {
        userId: typedReq.user._id,
        role: "admin",
        joinedAt: new Date(),
      },
    ],
  };

  // Only add imageUrl if it's a non-empty string
  if (imageUrl && imageUrl.trim().length > 0) {
    groupData.imageUrl = imageUrl.trim();
  }

  const group = await Group.create(groupData);

  const populatedGroup = await Group.findById(group._id)
    .populate("admin", "firstname lastname username")
    .populate("members.userId", "firstname lastname username")
    .lean();

  res.status(201).json({
    success: true,
    data: ensureImageUrl(populatedGroup),
  });
});

const getMyGroups = asyncHandler(async (req: Request, res: Response) => {
  const typedReq = req as AuthenticatedRequest;
  const userId = typedReq.user._id;

  const groups = await Group.find({
    $or: [{ admin: userId }, { "members.userId": userId }],
  })
    .populate("admin", "firstname lastname username")
    .populate("members.userId", "firstname lastname username")
    .sort({ updatedAt: -1 })
    .lean();

  // Ensure imageUrl is included in response (use null instead of undefined for JSON compatibility)
  const groupsWithImageUrl = groups.map((group) => ensureImageUrl(group));

  res.status(200).json({
    success: true,
    data: groupsWithImageUrl,
  });
});

const getGroupById = asyncHandler(async (req: Request, res: Response) => {
  const typedReq = req as AuthenticatedRequest;
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error("Invalid group ID");
  }

  const group = await Group.findById(id)
    .populate("admin", "firstname lastname username")
    .populate("members.userId", "firstname lastname username")
    .populate({
      path: "invites.userId",
      select: "firstname lastname username",
      strictPopulate: false,
    })
    .populate({
      path: "invites.invitedBy",
      select: "firstname lastname username",
      strictPopulate: false,
    })
    .lean();

  if (!group) {
    res.status(404);
    throw new Error("Group not found");
  }

  // Helper function to extract ID from populated or non-populated field
  const extractId = (field: any): string | null => {
    if (!field) return null;
    if (typeof field === "string") return field;
    if (typeof field === "object" && "_id" in field) {
      return field._id.toString();
    }
    if (field.toString) return field.toString();
    return null;
  };

  // Check if user is admin
  const adminId = extractId(group.admin);
  if (!adminId) {
    res.status(500);
    throw new Error("Group admin not found");
  }
  const isAdmin = adminId === typedReq.user._id.toString();

  // Check if user is a member
  const isMember =
    isAdmin ||
    (group.members || []).some((m) => {
      if (!m || !m.userId) return false;
      const memberUserId = extractId(m.userId);
      return memberUserId === typedReq.user._id.toString();
    });

  if (!isMember) {
    res.status(403);
    throw new Error("Not authorized to view this group");
  }

  res.status(200).json({
    success: true,
    data: ensureImageUrl(group),
  });
});

const inviteUser = asyncHandler(async (req: Request, res: Response) => {
  const typedReq = req as AuthenticatedRequest;
  const { id } = req.params;
  const { username }: InviteUserRequest = req.body;

  if (!username || username.trim().length === 0) {
    res.status(400);
    throw new Error("Username is required");
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error("Invalid group ID");
  }

  const group = await Group.findById(id);

  if (!group) {
    res.status(404);
    throw new Error("Group not found");
  }

  const isAdmin = group.admin.toString() === typedReq.user._id.toString();
  const isMember = group.members.some(
    (m) => m.userId.toString() === typedReq.user._id.toString()
  );

  if (!isAdmin && !isMember) {
    res.status(403);
    throw new Error("Not authorized to invite users to this group");
  }

  const userToInvite = await User.findOne({
    username: username.trim(),
  });

  if (!userToInvite) {
    res.status(404);
    throw new Error("User not found");
  }

  if (userToInvite._id.toString() === typedReq.user._id.toString()) {
    res.status(400);
    throw new Error("Cannot invite yourself");
  }

  const isAlreadyMember = group.members.some(
    (m) => m.userId.toString() === userToInvite._id.toString()
  );

  if (isAlreadyMember) {
    res.status(400);
    throw new Error("User is already a member of this group");
  }

  const existingInvite = group.invites.find(
    (invite) =>
      invite.userId.toString() === userToInvite._id.toString() &&
      invite.status === "pending"
  );

  if (existingInvite) {
    res.status(400);
    throw new Error("User already has a pending invite");
  }

  group.invites.push({
    userId: new mongoose.Types.ObjectId(userToInvite._id),
    invitedBy: new mongoose.Types.ObjectId(typedReq.user._id),
    status: "pending" as const,
    invitedAt: new Date(),
  });

  await group.save();

  const populatedGroup = await Group.findById(group._id)
    .populate("admin", "firstname lastname username")
    .populate("members.userId", "firstname lastname username")
    .populate("invites.userId", "firstname lastname username")
    .populate("invites.invitedBy", "firstname lastname username")
    .lean();

  res.status(200).json({
    success: true,
    data: ensureImageUrl(populatedGroup),
  });
});

const getMyInvites = asyncHandler(async (req: Request, res: Response) => {
  const typedReq = req as AuthenticatedRequest;
  const userId = typedReq.user._id;

  const groups = await Group.find({
    "invites.userId": userId,
    "invites.status": "pending",
  })
    .populate("admin", "firstname lastname username")
    .populate("members.userId", "firstname lastname username")
    .populate("invites.userId", "firstname lastname username")
    .populate("invites.invitedBy", "firstname lastname username")
    .lean();

  const myInvites = groups
    .map((group) => {
      const invite = group.invites.find((inv) => {
        let inviteUserId: string;
        if (
          typeof inv.userId === "object" &&
          inv.userId !== null &&
          "_id" in inv.userId
        ) {
          inviteUserId = (inv.userId as any)._id.toString();
        } else {
          inviteUserId = String(inv.userId);
        }
        return inviteUserId === userId.toString() && inv.status === "pending";
      });
      if (!invite) return null;
      return {
        group: {
          _id: group._id,
          name: group.name,
          imageUrl: group.imageUrl || null,
          admin: group.admin,
          members: group.members || [],
        },
        invite: {
          ...invite,
          invitedAt: invite.invitedAt,
        },
      };
    })
    .filter((invite) => invite !== null);

  res.status(200).json({
    success: true,
    data: myInvites,
  });
});

const respondToInvite = asyncHandler(async (req: Request, res: Response) => {
  const typedReq = req as AuthenticatedRequest;
  const { groupId, action }: RespondToInviteRequest = req.body;

  if (!groupId) {
    res.status(400);
    throw new Error("Group ID is required");
  }

  if (!action || !["accept", "deny"].includes(action)) {
    res.status(400);
    throw new Error("Action must be 'accept' or 'deny'");
  }

  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    res.status(400);
    throw new Error("Invalid group ID");
  }

  const group = await Group.findById(groupId);

  if (!group) {
    res.status(404);
    throw new Error("Group not found");
  }

  const inviteIndex = group.invites.findIndex(
    (invite) =>
      invite.userId.toString() === typedReq.user._id.toString() &&
      invite.status === "pending"
  );

  if (inviteIndex === -1) {
    res.status(404);
    throw new Error("No pending invite found for this group");
  }

  const invite = group.invites[inviteIndex];

  if (action === "accept") {
    invite.status = "accepted";
    invite.respondedAt = new Date();

    group.members.push({
      userId: new mongoose.Types.ObjectId(typedReq.user._id),
      role: "member" as const,
      joinedAt: new Date(),
    });
  } else {
    invite.status = "denied";
    invite.respondedAt = new Date();
  }

  await group.save();

  const populatedGroup = await Group.findById(group._id)
    .populate("admin", "firstname lastname username")
    .populate("members.userId", "firstname lastname username")
    .populate("invites.userId", "firstname lastname username")
    .populate("invites.invitedBy", "firstname lastname username")
    .lean();

  res.status(200).json({
    success: true,
    data: ensureImageUrl(populatedGroup),
  });
});

const searchUsers = asyncHandler(async (req: Request, res: Response) => {
  const typedReq = req as AuthenticatedRequest;
  const { query } = req.query;

  let users;

  if (
    !query ||
    typeof query !== "string" ||
    query.trim() === "" ||
    query === "*"
  ) {
    users = await User.find({
      _id: { $ne: typedReq.user._id },
    })
      .select("username")
      .limit(1000)
      .lean();
  } else {
    users = await User.find({
      username: { $regex: query, $options: "i" },
      _id: { $ne: typedReq.user._id },
    })
      .select("username")
      .limit(1000)
      .lean();
  }

  res.status(200).json({
    success: true,
    data: users,
  });
});

const updateGroupName = asyncHandler(async (req: Request, res: Response) => {
  const typedReq = req as AuthenticatedRequest;
  const { id } = req.params;
  const { name } = req.body;

  if (!name || name.trim().length === 0) {
    res.status(400);
    throw new Error("Group name is required");
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error("Invalid group ID");
  }

  const group = await Group.findById(id);

  if (!group) {
    res.status(404);
    throw new Error("Group not found");
  }

  const isAdmin = group.admin.toString() === typedReq.user._id.toString();
  const isKeyholder = group.members.some(
    (m) =>
      m.userId.toString() === typedReq.user._id.toString() && m.role === "admin"
  );

  if (!isAdmin && !isKeyholder) {
    res.status(403);
    throw new Error("Not authorized to change group name");
  }

  group.name = name.trim();
  await group.save();

  const populatedGroup = await Group.findById(group._id)
    .populate("admin", "firstname lastname username")
    .populate("members.userId", "firstname lastname username")
    .populate("invites.userId", "firstname lastname username")
    .populate("invites.invitedBy", "firstname lastname username")
    .lean();

  res.status(200).json({
    success: true,
    data: ensureImageUrl(populatedGroup),
  });
});

const removeInvite = asyncHandler(async (req: Request, res: Response) => {
  const typedReq = req as AuthenticatedRequest;
  const { id } = req.params;
  const { userId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error("Invalid group ID");
  }

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(400);
    throw new Error("Invalid user ID");
  }

  const group = await Group.findById(id);

  if (!group) {
    res.status(404);
    throw new Error("Group not found");
  }

  const isAdmin = group.admin.toString() === typedReq.user._id.toString();
  const isKeyholder = group.members.some(
    (m) =>
      m.userId.toString() === typedReq.user._id.toString() && m.role === "admin"
  );

  if (!isAdmin && !isKeyholder) {
    res.status(403);
    throw new Error("Not authorized to remove invites");
  }

  const pendingInvites = group.invites.filter(
    (inv) => inv.status === "pending"
  );

  if (pendingInvites.length <= 2) {
    res.status(400);
    throw new Error(
      "No other users can be dis-invited because a minimum of 2 invites must exist."
    );
  }

  group.invites = group.invites.filter(
    (inv) =>
      !(inv.userId.toString() === userId.toString() && inv.status === "pending")
  );

  await group.save();

  const populatedGroup = await Group.findById(group._id)
    .populate("admin", "firstname lastname username")
    .populate("members.userId", "firstname lastname username")
    .populate("invites.userId", "firstname lastname username")
    .populate("invites.invitedBy", "firstname lastname username")
    .lean();

  res.status(200).json({
    success: true,
    data: ensureImageUrl(populatedGroup),
  });
});

const leaveGroup = asyncHandler(async (req: Request, res: Response) => {
  const typedReq = req as AuthenticatedRequest;
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error("Invalid group ID");
  }

  const group = await Group.findById(id);

  if (!group) {
    res.status(404);
    throw new Error("Group not found");
  }

  const isAdmin = group.admin.toString() === typedReq.user._id.toString();

  if (isAdmin) {
    res.status(400);
    throw new Error("Admin cannot leave the group. Transfer ownership first.");
  }

  const memberIndex = group.members.findIndex(
    (m) => m.userId.toString() === typedReq.user._id.toString()
  );

  if (memberIndex === -1) {
    res.status(404);
    throw new Error("You are not a member of this group");
  }

  group.members.splice(memberIndex, 1);

  group.invites = group.invites.filter(
    (inv) => inv.userId.toString() !== typedReq.user._id.toString()
  );

  await group.save();

  res.status(200).json({
    success: true,
    message: "Successfully left the group",
  });
});

const transferOwnership = asyncHandler(async (req: Request, res: Response) => {
  const typedReq = req as AuthenticatedRequest;
  const { id } = req.params;
  const { userId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error("Invalid group ID");
  }

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(400);
    throw new Error("Invalid user ID");
  }

  const group = await Group.findById(id);

  if (!group) {
    res.status(404);
    throw new Error("Group not found");
  }

  if (group.admin.toString() !== typedReq.user._id.toString()) {
    res.status(403);
    throw new Error("Only the admin can transfer ownership");
  }

  const member = group.members.find(
    (m) => m.userId.toString() === userId.toString()
  );

  if (!member) {
    res.status(404);
    throw new Error("User is not a member of this group");
  }

  group.admin = new mongoose.Types.ObjectId(userId);
  member.role = "admin";

  const oldAdminMember = group.members.find(
    (m) => m.userId.toString() === typedReq.user._id.toString()
  );
  if (oldAdminMember) {
    oldAdminMember.role = "member";
  }

  await group.save();

  const populatedGroup = await Group.findById(group._id)
    .populate("admin", "firstname lastname username")
    .populate("members.userId", "firstname lastname username")
    .populate("invites.userId", "firstname lastname username")
    .populate("invites.invitedBy", "firstname lastname username")
    .lean();

  res.status(200).json({
    success: true,
    data: ensureImageUrl(populatedGroup),
  });
});

const deactivateGroup = asyncHandler(async (req: Request, res: Response) => {
  const typedReq = req as AuthenticatedRequest;
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error("Invalid group ID");
  }

  const group = await Group.findById(id);

  if (!group) {
    res.status(404);
    throw new Error("Group not found");
  }

  const isAdmin = group.admin.toString() === typedReq.user._id.toString();
  const isKeyholder = group.members.some(
    (m) =>
      m.userId.toString() === typedReq.user._id.toString() && m.role === "admin"
  );

  if (!isAdmin && !isKeyholder) {
    res.status(403);
    throw new Error("Not authorized to deactivate group");
  }

  await Group.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: "Group deactivated successfully",
  });
});

export {
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
};
