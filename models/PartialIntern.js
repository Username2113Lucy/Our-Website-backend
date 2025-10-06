import mongoose from "mongoose";

const partialInternSchema = new mongoose.Schema({
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
  
  // Internship Information
  domain: { type: String, trim: true },
  duration: { type: String, trim: true },
  internshipType: { type: String, trim: true },
  startDate: { type: Date },
  interestReason: { type: String, default: "" },
  skills: { type: String, default: "" },
  previousExperience: { type: String, default: "" },
  expectations: { type: String, default: "" },
  
  // ✅ BOTH Referral Codes
  referralCode: { type: String, default: "" },        // Code someone gave THEM
  yourReferralCode: { type: String, default: "" },    // Their OWN code
  
  // Agreement & Source
  heardFrom: { type: String, default: "" },
  agreement: { type: Boolean, default: false },
  
  // Payment/Access Preference
  accessPreference: { type: String, enum: ["Full Access", "Flexible Access"], default: "Full Access" },
  additionalComments: { type: String, default: "" },
  
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
  totalCost: { type: Number, default: 0 },            // Total internship cost
  amountPaid: { type: Number, default: 0 }            // Amount paid by student
});

partialInternSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const PartialIntern = mongoose.model("PartialIntern", partialInternSchema);
export default PartialIntern;