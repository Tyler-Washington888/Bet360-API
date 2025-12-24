import mongoose, { Schema, Model } from "mongoose";

export interface ISubscriptionDocument {
  _id: string;
  bet360Email: string;
  sportsbookSubscriptions: {
    betwiz: boolean;
    winningedge: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscriptionDocument>(
  {
    bet360Email: {
      type: String,
      required: [true, "Bet360 email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (value: string): boolean {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(value);
        },
        message: "Please provide a valid email address",
      },
    },
    sportsbookSubscriptions: {
      betwiz: {
        type: Boolean,
        default: false,
      },
      winningedge: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);


const Subscription: Model<ISubscriptionDocument> = mongoose.model<ISubscriptionDocument>(
  "Subscription",
  subscriptionSchema
);

export default Subscription;




