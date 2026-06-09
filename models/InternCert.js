import mongoose from 'mongoose';

const internCertSchema = new mongoose.Schema({
  internCertId: {
    type: String,
    required: true,
    unique: true
  },
  studentName: {
    type: String,
    required: true
  },
  collegeName: {
    type: String,
    required: true
  },
  department: {           // ✅ ADD THIS FIELD
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
  internshipMode: {
    type: String,
    enum: ['Online', 'Offline'],
    default: 'Online'
  },
  duration: {
    type: String
  },
  issueDate: {
    type: Date,
    default: Date.now
  },
  qrCodeData: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('InternCert', internCertSchema);