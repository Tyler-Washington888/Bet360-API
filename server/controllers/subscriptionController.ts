import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Subscription from "../models/subscriptionModel";
import {
  UpdateSubscriptionRequest,
  SubscriptionStatusResponse,
} from "../interfaces/subscription";
import { AuthenticatedRequest } from "../interfaces/user";




const updateSubscription = asyncHandler(
  async (req: Request, res: Response<SubscriptionStatusResponse>) => {
    const { bet360Email, sportsbook, isSubscribed }: UpdateSubscriptionRequest =
      req.body;

    if (!bet360Email) {
      res.status(400);
      throw new Error("Bet360 email is required");
    }

    if (!sportsbook || !["betwiz", "winningedge"].includes(sportsbook)) {
      res.status(400);
      throw new Error("Valid sportsbook (betwiz or winningedge) is required");
    }

    if (typeof isSubscribed !== "boolean") {
      res.status(400);
      throw new Error("isSubscribed must be a boolean");
    }

    
    let subscription = await Subscription.findOne({ bet360Email });

    if (!subscription) {
      subscription = await Subscription.create({
        bet360Email,
        sportsbookSubscriptions: {
          betwiz: false,
          winningedge: false,
        },
      });
    }

    
    subscription.sportsbookSubscriptions[sportsbook] = isSubscribed;
    await subscription.save();

    const response: SubscriptionStatusResponse = {
      bet360Email: subscription.bet360Email,
      sportsbookSubscriptions: subscription.sportsbookSubscriptions,
    };

    res.status(200).json(response);
  }
);




const getSubscriptionStatus = asyncHandler(
  async (req: Request, res: Response<SubscriptionStatusResponse>) => {
    const typedReq = req as AuthenticatedRequest;
    const { email } = req.params;

    
    if (email !== typedReq.user.email) {
      res.status(403);
      throw new Error("Not authorized to access this resource");
    }

    
    const OAuthToken = (await import("../models/oauthTokenModel")).default;
    
    const [betwizToken, winningedgeToken] = await Promise.all([
      OAuthToken.findOne({
        bet360Email: email,
        sportsbook: "betwiz",
        isActive: true,
      }),
      OAuthToken.findOne({
        bet360Email: email,
        sportsbook: "winningedge",
        isActive: true,
      }),
    ]);

    
    const betwizConnected = betwizToken && !betwizToken.isRefreshTokenExpired();
    const winningedgeConnected = winningedgeToken && !winningedgeToken.isRefreshTokenExpired();

    const response: SubscriptionStatusResponse = {
      bet360Email: email,
      sportsbookSubscriptions: {
        betwiz: betwizConnected || false,
        winningedge: winningedgeConnected || false,
      },
    };

    res.status(200).json(response);
  }
);

export { updateSubscription, getSubscriptionStatus };

