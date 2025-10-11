import mongoose from "mongoose";

const partialCourseSchema = new mongoose.Schema({
  // Personal Information
  fullName: { type: String, trim: true },
  email: { 
    type: String, 
    required: true, 
    lowercase: true, 
    trim: true, 
    unique: true, 
    sparse: true 
  },
  phone: { 
    type: String, 
    trim: true, 
    unique: true, 
    sparse: true 
  },
  gender: { type: String, enum: ["Male", "Female", "Other"] },
  city: { type: String, trim: true },
  dob: { type: Date },
  
  // Academic Information
  college: { type: String, trim: true },
  degree: { type: String, trim: true },
  department: { type: String, trim: true },
  year: { type: String, trim: true },
  rollNumber: { type: String, trim: true },
  
  // Course Information
  courseName: { type: String, trim: true },
  courseDuration: { type: String, trim: true },
  learningMode: { type: String, trim: true },
  preferredTimeSlot: { type: String, trim: true },
  courseLevel: { type: String, trim: true },
  startDate: { type: Date },
  previousExperience: { type: String, default: "" },
  additionalComments: { type: String, default: "" },
  
  // ✅ BOTH Referral Codes
  referralCode: { type: String, default: "" },        // Code someone gave THEM
  yourReferralCode: { type: String, default: "" },    // Their OWN code
  
  // Agreement & Source
  heardFrom: { type: String, default: "" },
  agreement: { type: Boolean, default: false },
  
  // Payment/Access Preference
  accessPreference: { type: String, enum: ["Full Access", "Flexible Access"], default: "Full Access" },
  
  // File upload
  resume: { 
    type: mongoose.Schema.Types.Mixed,
    default: null 
  },
  
  // System fields
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ["Not Viewed", "Viewed"], default: "Not Viewed" },
  
  // ✅ ADDED: 3 Admin Panel Columns
  notes: { type: String, default: "" },               // Admin notes/comments
  totalCost: { type: Number, default: 0 },            // Total course cost
  amountPaid: { type: Number, default: 0 }            // Amount paid by student
});

partialCourseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const PartialCourse = mongoose.model("PartialCourse", partialCourseSchema);
export default PartialCourse;