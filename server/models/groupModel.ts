import mongoose, { Schema, Model, Document } from "mongoose";

export interface IGroupMember {
  userId: mongoose.Types.ObjectId;
  role: "admin" | "member";
  joinedAt: Date;
}

export interface IGroupInvite {
  userId: mongoose.Types.ObjectId;
  invitedBy: mongoose.Types.ObjectId;
  status: "pending" | "accepted" | "denied";
  invitedAt: Date;
  respondedAt?: Date;
}

export interface IGroupDocument extends Omit<Document, "_id"> {
  _id: mongoose.Types.ObjectId;
  name: string;
  imageUrl?: string;
  admin: mongoose.Types.ObjectId;
  members: IGroupMember[];
  invites: IGroupInvite[];
  createdAt: Date;
  updatedAt: Date;
}

const groupMemberSchema = new Schema<IGroupMember>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "member"],
      default: "member",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const groupInviteSchema = new Schema<IGroupInvite>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "denied"],
      default: "pending",
    },
    invitedAt: {
      type: Date,
      default: Date.now,
    },
    respondedAt: {
      type: Date,
    },
  },
  { _id: false }
);

const groupSchema = new Schema<IGroupDocument>(
  {
    name: {
      type: String,
      required: [true, "Group name is required"],
      trim: true,
      minlength: [1, "Group name must be at least 1 character"],
      maxlength: [100, "Group name cannot exceed 100 characters"],
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    admin: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    members: {
      type: [groupMemberSchema],
      default: [],
    },
    invites: {
      type: [groupInviteSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

groupSchema.index({ admin: 1 });
groupSchema.index({ "members.userId": 1 });
groupSchema.index({ "invites.userId": 1, "invites.status": 1 });

const Group: Model<IGroupDocument> = mongoose.model<IGroupDocument>(
  "Group",
  groupSchema
);

export default Group;


