import mongoose from "mongoose";

const registerCareerSchema = new mongoose.Schema({
  // Personal Information
  fullName: { 
    type: String, 
    required: true, 
    trim: true 
  },
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
    trim: true 
  },
  city: { 
    type: String, 
    required: true, 
    trim: true 
  },
  gender: { 
    type: String, 
    enum: ["Male", "Female", "Other", ""],
    default: "" 
  },
  
  // Professional Information
  position: { 
    type: String, 
    required: true, 
    trim: true 
  },
  experienceType: { 
    type: String, 
    required: true, 
    enum: ["fresher", "experienced"] 
  },
  currentCompany: { 
    type: String, 
    trim: true,
    default: "" 
  },
  currentDesignation: { 
    type: String, 
    trim: true,
    default: "" 
  },
  experience: { 
    type: String, 
    trim: true,
    default: "" 
  },
  currentCTC: { 
    type: Number,
    default: 0 
  },
  expectedCTC: { 
    type: Number,
    default: 0 
  },
  noticePeriod: { 
    type: String, 
    trim: true,
    default: "" 
  },
  
  // Education Details
  highestQualification: { 
    type: String, 
    required: true, 
    trim: true 
  },
  degree: { 
    type: String, 
    required: true, 
    trim: true 
  },
  domain: { 
    type: String, 
    required: true, 
    trim: true 
  },
  
  // Application Details
  heardFrom: { 
    type: String, 
    required: true, 
    trim: true 
  },
  interestReason: { 
    type: String, 
    required: true, 
    trim: true 
  },
  
  // File upload
  resume: { 
    type: mongoose.Schema.Types.Mixed,
    default: null 
  },
  
  resumePath: { 
    type: String, 
    default: "" 
  },
  uploadDirectory: { 
    type: String, 
    default: "upload_careers" 
  },
  
  // System fields
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  status: { 
    type: String, 
    enum: ["New", "Reviewed", "Interview", "Rejected", "Hired"], 
    default: "New" 
  },
  
  // Admin Panel Columns
  notes: { 
    type: String, 
    default: "" 
  },
  rating: { 
    type: Number, 
    default: 0 
  },
  interviewDate: { 
    type: Date 
  }
});

registerCareerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const RegisterCareer = mongoose.model("RegisterCareer", registerCareerSchema);
export default RegisterCareer;