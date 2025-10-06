import mongoose from "mongoose";

const registerInternSchema = new mongoose.Schema({
  // Personal Information
  fullName: { type: String, required: true, trim: true },
  email: { 
    type: String, 
    required: true, 
    lowercase: true, 
    trim: true, 
    unique: true 
  },
  phone: { 
    type: String, 
    required: true, 
    trim: true, 
    unique: true 
  },
  gender: { type: String, required: true, enum: ["Male", "Female", "Other"] },
  city: { type: String, required: true, trim: true },
  dob: { type: Date, required: true },
  
  // Academic Information
  college: { type: String, required: true, trim: true },
  degree: { type: String, required: true, trim: true },
  department: { type: String, required: true, trim: true },
  year: { type: String, required: true, trim: true },
  rollNumber: { type: String, trim: true },
  
  // Internship Information
  domain: { type: String, required: true, trim: true },
  duration: { type: String, required: true, trim: true },
  internshipType: { type: String, required: true, trim: true },
  startDate: { type: Date, required: true },
  interestReason: { type: String, required: true },
  skills: { type: String, required: true },
  previousExperience: { type: String, default: "" },
  expectations: { type: String, default: "" },
  
  // ✅ BOTH Referral Codes
  referralCode: { type: String, default: "" },        // Code someone gave THEM
  yourReferralCode: { type: String, default: "" },    // Their OWN code
  
  // Agreement & Source
  heardFrom: { type: String, default: "" },
  agreement: { type: Boolean, required: true },
  
  // Payment/Access Preference
  accessPreference: { type: String, enum: ["Full Access", "Flexible Access"], required: true },
  additionalComments: { type: String, default: "" },
  
  // File upload
  resume: { 
    data: Buffer,
    contentType: String,
    filename: String,
    size: Number
  },
  resumePath: { type: String, default: "" },
  uploadDirectory: { type: String, default: "upload_internship" },
  
  // System fields
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ["Not Viewed", "Viewed"], default: "Not Viewed" },
  
  // ✅ ADDED: 3 Admin Panel Columns
  notes: { type: String, default: "" },               // Admin notes/comments
  totalCost: { type: Number, default: 0 },            // Total internship cost
  amountPaid: { type: Number, default: 0 }            // Amount paid by student
});

registerInternSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const RegisterIntern = mongoose.model("RegisterIntern", registerInternSchema);
export default RegisterIntern;