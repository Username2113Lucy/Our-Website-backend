import mongoose from "mongoose";

const ideaForgeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters'],
    match: [/^[A-Za-z\s]+$/, 'Name can only contain letters and spaces']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit phone number starting with 6-9']
  },
  degree: { // Changed from 'class' to 'degree'
    type: String,
    required: [true, 'Degree is required'],
    trim: true,
    minlength: [2, 'Degree must be at least 2 characters'],
    maxlength: [50, 'Degree cannot exceed 50 characters']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true,
    minlength: [2, 'Department must be at least 2 characters'],
    maxlength: [50, 'Department cannot exceed 50 characters']
  },
  year: {
    type: String,
    required: [true, 'Year is required'],
    enum: ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Final Year']
  },
  domain: {
    type: String,
    required: [true, 'Domain is required'],
    enum: [
    'Web Development',
    'Mobile App Development',
    'Artificial Intelligence & Machine Learning', // ADD THIS
    'Data Science',
    'IoT',
    'Cybersecurity',
    'Blockchain',
    'Cloud Computing',
    'UI/UX Design',
    'Other'
    ]
  },
  ideaType: {
    type: String,
    required: [true, 'Idea type is required'],
    enum: ['existing', 'own']
  },
  ideaDescription: {
    type: String,
    required: false, // Make sure this is false
    validate: {
      validator: function(description) {
        // Only validate if description exists and is not empty
        if (description && description.trim() !== '') {
          return description.trim().length >= 20 && description.trim().length <= 500;
        }
        return true; // Empty or undefined is valid
      },
      message: 'Idea description must be between 20 and 500 characters if provided'
    },
    trim: true
  },
  finalDate: {
    type: Date,
    required: [true, 'Preferred completion date is required'],
    validate: {
      validator: function(date) {
        const today = new Date();
        const maxDate = new Date();
        maxDate.setFullYear(today.getFullYear() + 1);
        return date >= today && date <= maxDate;
      },
      message: 'Date must be between today and 1 year from now'
    }
  },
  gotReferral: {
    type: String,
    required: [true, 'Referral status is required'],
    enum: ['yes', 'no']
  },
  referralCode: {
    type: String,
    validate: {
      validator: function(code) {
        if (this.gotReferral === 'yes') {
          const referralRegex = /^VR-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
          return referralRegex.test(code);
        }
        return true;
      },
      message: 'Referral code must be in format: VR-XXXX-XXXX'
    },
    uppercase: true,
    trim: true
  },
  generatedReferralCode: {
    type: String,
    unique: true,
    sparse: true,
    match: [/^VR-[A-Z0-9]{4}-[A-Z0-9]{4}$/, 'Invalid referral code format']
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Compound index for duplicate prevention
ideaForgeSchema.index({ email: 1 }, { unique: true });
ideaForgeSchema.index({ phone: 1 }, { unique: true });
ideaForgeSchema.index({ generatedReferralCode: 1 }, { unique: true, sparse: true });

// Pre-save middleware to generate referral code
ideaForgeSchema.pre('save', function(next) {
  if (this.isNew) {
    this.generatedReferralCode = generateReferralCode.call(this.constructor);
  }
  next();
});

// Static method to generate unique referral code
function generateReferralCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "VR-";
  
  // Note: In a real implementation, you'd want to check for uniqueness in the database
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
    if (i === 3) result += "-";
  }
  
  return result;
}

// Method to check for duplicate entries
ideaForgeSchema.statics.checkDuplicate = async function(email, phone) {
  const existing = await this.findOne({
    $or: [
      { email: email.toLowerCase() },
      { phone: phone }
    ]
  });
  
  return !!existing;
};

const IdeaForge = mongoose.model('IdeaForge', ideaForgeSchema);
export default IdeaForge;