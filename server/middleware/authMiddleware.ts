import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler";
import { Request, Response, NextFunction } from "express";
import User from "../models/userModel";
import { IUserDocument } from "../interfaces/user";
import { JWTPayload } from "../interfaces/jwt";
import { AuthenticatedRequest } from "../interfaces/user";

const protect = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let token: string | undefined;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      try {
        token = req.headers.authorization.split(" ")[1];

        const secret = process.env.JWT_SECRET;
        if (!secret) {
          throw new Error("JWT_SECRET is not defined");
        }

        const decoded = jwt.verify(token, secret) as JWTPayload;

        const user: IUserDocument | null = await User.findById(
          decoded.id
        ).select("-password");

        if (!user) {
          res.status(401);
          throw new Error("Not authorized - user not found");
        }

        (req as AuthenticatedRequest).user = user;

        next();
      } catch (error) {
        res.status(401);
        throw new Error("Not authorized");
      }
    }

    if (!token) {
      res.status(401);
      throw new Error("Not authorized, no token");
    }
  }
);

export { protect };




