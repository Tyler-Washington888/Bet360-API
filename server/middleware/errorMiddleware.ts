import { Request, Response, NextFunction } from "express";

interface CustomError extends Error {
  status?: number;
  code?: number;
  errors?: { [key: string]: { message: string } };
}

const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err };
  error.message = err.message;

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = "Resource not found";
    error = { message, status: 404 } as CustomError;
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = "Duplicate field value entered";
    error = { message, status: 400 } as CustomError;
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors || {}).map((val) => val.message);
    error = { message: message.join(", "), status: 400 } as CustomError;
  }

  res.status(error.status || 500).json({
    success: false,
    error: error.message || "Server Error",
  });
};

export { errorHandler };

