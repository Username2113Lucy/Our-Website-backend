import mongoose from "mongoose";

const RDProjectSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },

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
      required: true, 
      trim: true, 
      unique: true, 
      sparse: true 
    },

    gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
    city: { type: String, required: true },
    dob: { type: Date, required: true },
    college: { type: String, required: true, trim: true },
    degree: { type: String, required: true },
    department: { type: String, required: true, trim: true },
    year: { type: String, required: true, trim: true },

    rollNumber: { 
      type: String, 
      required: true, 
      trim: true, 

    },

    projectDomain: { type: String, required: true, trim: true },
    projectTitle: { type: String, required: true, maxlength: 500, trim: true },
    stage: { type: String, default: "Idea" },
    teamType: { type: String, enum: ["Team", "Individual"], required: true, default: "Individual" },
    teamMembers: { type: String, default: "" },
    shortDesc: { type: String, default: "" },
    supervisor: { type: String, default: "" },
    skills: { type: String, default: "" },
    abstractFile: { type: String, default: "" },

    accessPreference: { 
      type: String, 
      enum: ["Full Access", "Flexible Access"], 
      required: true 
    },

    projectAccess: {
      type: String,
      enum: [
        "Full Access (One-time payment)", 
        "Flexible Access (Installment / Due-based option)"
      ],
      required: true
    },

    additionalComments: { type: String, default: "" },
    heardFrom: { type: String, default: "" },
    yourReferralCode: { type: String, default: "" },
    referralCode: { type: String, default: "" },
    agreement: { type: Boolean, required: true, default: false }
  },
  { timestamps: true }
);

const RDProject = mongoose.model("RDProject", RDProjectSchema);

export default RDProject;