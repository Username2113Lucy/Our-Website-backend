// models/CourseRegistration.js
import mongoose from "mongoose";

const CourseRegSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    gender: { type: String, required: true },
    city: { type: String },
    college: { type: String },
    degree: { type: String },
    department: { type: String },
    year: { type: String },
    rollNo: { type: String },

    // Course-specific fields
    courseName: { type: String, required: true },   // e.g., Data Science, AI/ML
    duration: { type: String },                     // e.g., 3 months
    mode: { type: String, required: true },         // Online, Offline, Hybrid
    preferredTime: { type: String },                // Morning, Evening, Weekend
    level: { type: String },                        // Beginner, Intermediate, Advanced

    // Optional extras
    additionalComments: { type: String },
    paymentStatus: { type: String, default: "Pending" }, // Pending, Completed
  },
  { timestamps: true }
);

const CourseRegistration = mongoose.model("CourseRegistration", CourseRegSchema);
export default CourseRegistration;
