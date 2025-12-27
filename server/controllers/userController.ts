import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/userModel";
import {
  LoginRequest,
  LoginResponse,
  ProfileResponse,
  IUserDocument,
  SignUpResponse,
  SignUpRequest,
  AuthenticatedRequest,
} from "../interfaces/user";
import { JWTPayload } from "../interfaces/jwt";




const signUp = asyncHandler(
  async (req: Request, res: Response<SignUpResponse>) => {
    const {
      firstname,
      lastname,
      username,
      email,
      password,
      dateOfBirth,
      role,
    }: SignUpRequest = req.body;

    if (!email) {
      res.status(400);
      throw new Error("Email is required");
    }

    if (!password) {
      res.status(400);
      throw new Error("Password is required");
    }

    
    if (password.length > 40) {
      res.status(400);
      throw new Error("Password cannot exceed 40 characters");
    }

    if (!firstname) {
      res.status(400);
      throw new Error("First name is required");
    }

    if (!username) {
      res.status(400);
      throw new Error("Username is required");
    }

    if (username.length > 15) {
      res.status(400);
      throw new Error("Username cannot exceed 15 characters");
    }

    if (!dateOfBirth) {
      res.status(400);
      throw new Error("Date of birth is required");
    }

    const emailExists = await User.findOne({ email });
    if (emailExists) {
      res.status(400);
      throw new Error("Email already registered");
    }

    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      res.status(400);
      throw new Error("Username already taken");
    }
    const user: IUserDocument = await User.create({
      firstname,
      lastname,
      username,
      email,
      password,
      dateOfBirth,
      role,
    });

    if (user) {
      const userIdToString = user._id.toString();

      const response: SignUpResponse = {
        _id: userIdToString,
        firstname: user.firstname,
        lastname: user.lastname,
        username: user.username,
        email: user.email,
        dateOfBirth: user.dateOfBirth,
        role: user.role,
        token: generateJsonWebToken(userIdToString),
      };

      res.status(201).json(response);
    } else {
      res.status(400);
      throw new Error("Invalid user data");
    }
  }
);




const login = asyncHandler(
  async (req: Request, res: Response<LoginResponse>) => {
    const { email, password }: LoginRequest = req.body;

    if (!email) {
      res.status(400);
      throw new Error("Email is required");
    }

    if (!password) {
      res.status(400);
      throw new Error("Password is required");
    }

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      const userIdToString = user._id.toString();

      const response: LoginResponse = {
        _id: userIdToString,
        firstname: user.firstname,
        lastname: user.lastname,
        username: user.username,
        email: user.email,
        dateOfBirth: user.dateOfBirth,
        role: user.role,
        token: generateJsonWebToken(userIdToString),
      };

      res.json(response);
    } else {
      res.status(401);
      throw new Error("Invalid credentials");
    }
  }
);




const getProfile = asyncHandler(
  async (req: Request, res: Response<ProfileResponse>) => {
    const typedReq = req as AuthenticatedRequest;

    const user: IUserDocument | null = await User.findById(
      typedReq.user._id.toString()
    );

    if (!user) {
      res.status(401);
      throw new Error("User not found");
    }

    const userIdToString = user._id.toString();

    const response: ProfileResponse = {
      _id: userIdToString,
      firstname: user.firstname,
      lastname: user.lastname,
      username: user.username,
      email: user.email,
      dateOfBirth: user.dateOfBirth,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.status(200).json(response);
  }
);


const generateJsonWebToken = (id: string): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  const payload: JWTPayload = { id };

  return jwt.sign(payload, secret, {
    expiresIn: "30d",
  });
};

export { signUp, login, getProfile };

