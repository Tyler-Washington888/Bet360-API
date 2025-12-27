import mongoose, { Schema, Model } from "mongoose";
import { IUserDocument, UserRole } from "../interfaces/user";
import bcrypt from "bcryptjs";

const userSchema = new Schema<IUserDocument>(
  {
    firstname: {
      type: String,
      required: [true, "Please add a first name"],
      minlength: [1, "First name must be at least 1 character"],
      maxlength: [255, "First name cannot exceed 255 characters"],
      trim: true,
    },
    lastname: {
      type: String,
      required: false,
      maxlength: [255, "Last name cannot exceed 255 characters"],
      trim: true,
    },
    username: {
      type: String,
      required: [true, "Please add a username"],
      unique: true,
      trim: true,
      minlength: [1, "Username must be at least 1 character"],
      maxlength: [15, "Username cannot exceed 15 characters"],
    },
    email: {
      type: String,
      required: [true, "Please add an email"],
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
    password: {
      type: String,
      required: [true, "Please add a password"],
      
      
      validate: {
        validator: function (value: string): boolean {
          return !/\s/.test(value);
        },
        message: "Password cannot contain spaces",
      },
    },
    dateOfBirth: {
      type: String,
      required: [true, "Please add date of birth"],
      validate: [
        {
          validator: function (value: string): boolean {
            
            const dateRegex =
              /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])-(19|20)\d{2}$/;
            return dateRegex.test(value);
          },
          message:
            "Date of birth must be in MM-DD-YYYY format (e.g., 01-15-1990)",
        },
        {
          validator: function (value: string): boolean {
            
            const [month, day, year] = value.split("-").map(Number);

            
            if (month < 1 || month > 12) {
              return false;
            }

            
            const daysInMonth = [
              31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
            ];

            
            const isLeapYear =
              (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
            if (isLeapYear && month === 2) {
              daysInMonth[1] = 29;
            }

            
            if (day < 1 || day > daysInMonth[month - 1]) {
              return false;
            }

            return true;
          },
          message:
            "Please provide a valid date with correct month (01-12) and day for the given month",
        },
        {
          validator: function (value: string): boolean {
            const [month, day, year] = value.split("-").map(Number);
            const birthDate = new Date(year, month - 1, day);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();

            if (
              monthDiff < 0 ||
              (monthDiff === 0 && today.getDate() < birthDate.getDate())
            ) {
              return age - 1 >= 21;
            }

            return age >= 21;
          },
          message: "You must be at least 21 years old to register",
        },
      ],
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
    },
  },
  {
    timestamps: true,
  }
);


userSchema.pre<IUserDocument>("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});


userSchema.methods.matchPassword = async function (
  enteredPassword: string
): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};


const User: Model<IUserDocument> = mongoose.model<IUserDocument>(
  "User",
  userSchema
);

export default User;
