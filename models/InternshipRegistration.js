import mongoose from 'mongoose';

const internshipRegistrationSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  college: {
    type: String,
    required: true
  },
  domain: {
    type: String,
    required: true
  },
  fromDate: {
    type: Date,
    required: true
  },
  toDate: {
    type: Date,
    required: true
  },
  resumeUrl: {
    type: String,
    default: null
  },
  resumeFileName: {
    type: String,
    default: null
  },
    contactNumber: {        // ✅ ADD THIS
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('InternshipRegistration', internshipRegistrationSchema);