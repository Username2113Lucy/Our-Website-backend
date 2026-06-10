import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import InternshipRegistration from '../models/InternshipRegistration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/resumes');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `resume-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, and DOCX files are allowed'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Create registration
router.post('/register', upload.single('resume'), async (req, res) => {
  try {
    const { fullName, contactNumber, department, college, domain, fromDate, toDate } = req.body;  // ✅ Add contactNumber
    
    const registrationData = {
      fullName,
           contactNumber,  // ✅ ADD THIS - was missing
      department,
      college,
      domain,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate)
    };
    
    if (req.file) {
      registrationData.resumeUrl = `/uploads/resumes/${req.file.filename}`;
      registrationData.resumeFileName = req.file.originalname;
    }
    
    const registration = new InternshipRegistration(registrationData);
    await registration.save();
    
    res.status(201).json({
      success: true,
      message: 'Registration submitted successfully!',
      data: registration
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get all registrations (admin)
router.get('/registrations', async (req, res) => {
  try {
    const registrations = await InternshipRegistration.find().sort({ createdAt: -1 });
    res.json({ success: true, data: registrations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single registration
router.get('/registrations/:id', async (req, res) => {
  try {
    const registration = await InternshipRegistration.findById(req.params.id);
    if (!registration) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }
    res.json({ success: true, data: registration });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update registration
router.put('/registrations/:id', async (req, res) => {
  try {
    const registration = await InternshipRegistration.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json({ success: true, data: registration });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete registration
router.delete('/registrations/:id', async (req, res) => {
  try {
    await InternshipRegistration.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Registration deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;