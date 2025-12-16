import { Document } from "mongoose";
import { Request } from "express";

// ====== ENUMS ======
export enum UserRole {
  USER = "user",
  ADMIN = "admin",
}

// ====== MONGOOSE DOCUMENT INTERFACE ======
export interface IUserDocument extends Document {
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  dateOfBirth: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  matchPassword(enteredPassword: string): Promise<boolean>;
}

// ====== REQUEST INTERFACES ======
export interface SignUpRequest {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  dateOfBirth: string;
  role?: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthenticatedRequest extends Request {
  user: IUserDocument;
}

// ====== RESPONSE INTERFACES ======
export interface SignUpResponse {
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  dateOfBirth: string;
  token: string;
  role: UserRole;
}

export interface LoginResponse {
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  dateOfBirth: string;
  token: string;
  role: string;
}

export interface ProfileResponse {
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  dateOfBirth: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

