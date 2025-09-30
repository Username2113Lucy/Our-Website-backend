import mongoose from "mongoose";

const partialSchema = new mongoose.Schema({
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
  college: { type: String, trim: true },
  degree: { type: String, trim: true },
  department: { type: String, trim: true },
  year: { type: String, trim: true },

  rollNumber: { 
    type: String, 
    trim: true, 
  },

  domain: { type: String, trim: true },
  projectTitle: { type: String, trim: true, default: "Project Title Not Provided" },
  teamType: { type: String, enum: ["Individual", "Team"], default: "Individual" },
  teamMembers: { type: String, default: "" }, 
  stage: { type: String, default: "Idea" },
  shortDesc: { type: String, default: "" },
  supervisor: { type: String, default: "" },
  skills: { type: String, default: "" },
  accessPreference: { type: String, enum: ["Full Access", "Flexible Access"], default: "Full Access" },
  additionalComments: { type: String, default: "" },
  heardFrom: { type: String, default: "" },
  referralCode: { type: String, default: "" },
  agreement: { type: Boolean, default: false },
  
  // ✅ Fixed: Changed to Mixed type to handle file objects
  proposal: { 
    type: mongoose.Schema.Types.Mixed,
    default: null 
  }, 
  
  projectAccess: { 
    type: String, 
    enum: [
      "Full Access (One-time payment)", 
      "Flexible Access (Installment / Due-based option)"
    ],
    default: "Full Access (One-time payment)"
  },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ["Not Viewed", "Viewed"], default: "Not Viewed" }
});

// ✅ REMOVED duplicate index definitions - they're already in field definitions

const Partial = mongoose.model("Partial", partialSchema);

export default Partial; 