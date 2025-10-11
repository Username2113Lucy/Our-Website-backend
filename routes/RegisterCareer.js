import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from 'url';
import RegisterCareer from "../models/RegisterCareer.js"; // ✅ Import the model

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for resume uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../upload_careers'));
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = path.parse(file.originalname).name;
    const extension = path.extname(file.originalname);
    cb(null, `${originalName}-${timestamp}${extension}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed'), false);
    }
  }
});

// ✅ DUPLICATE CHECK ENDPOINT
// ✅ CAREER REGISTRATION ENDPOINT
router.post('/registration', upload.single('resume'), async (req, res) => {
  console.log("📥 Received registration request");
  console.log("📄 File:", req.file ? `Yes - ${req.file.originalname}` : 'No file');
  console.log("📋 Form data:", req.body);

  try {
    // ✅ FIX: Use proper destructuring with defaults for ALL fields
    const {
      fullName = '',
      email = '',
      phone = '',
      city = '',
      gender = '',
      position = '',
      experienceType = '',
      currentCompany = '',
      currentDesignation = '',
      experience = '',
      currentCTC = '',
      expectedCTC = '',
      noticePeriod = '',
      highestQualification = '',
      degree = '',
      domain = '',
      heardFrom = '',
      interestReason = ''
    } = req.body;

    console.log("🔍 Validating required fields...");

    // Validate required fields
    const requiredFields = [
      'fullName', 'email', 'phone', 'city', 'position', 'experienceType',
      'highestQualification', 'degree', 'heardFrom', 'interestReason'
    ];
    
    const missingFields = requiredFields.filter(field => !req.body[field] || req.body[field].trim() === '');
    
    if (missingFields.length > 0) {
      console.log("❌ Missing fields:", missingFields);
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    if (!req.file) {
      console.log("❌ No resume file uploaded");
      return res.status(400).json({
        success: false,
        message: "Resume file is required"
      });
    }

    console.log("🔍 Checking for duplicates...");
    
    // Check for duplicate application
    const duplicate = await RegisterCareer.findOne({
      $or: [
        { email: email.toLowerCase().trim() },
        { phone: phone.trim() }
      ]
    });

    if (duplicate) {
      console.log("❌ Duplicate application found");
      const fs = await import('fs');
      const filePath = path.join(__dirname, '../upload_careers', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      return res.status(409).json({
        success: false,
        message: "An application with this email or phone number already exists"
      });
    }

    console.log("💾 Creating new registration...");

    // ✅ FIX: Safe field assignment with null checks
    const newRegistration = new RegisterCareer({
      fullName: fullName?.trim() || '',
      email: email?.toLowerCase().trim() || '',
      phone: phone?.trim() || '',
      city: city?.trim() || '',
      gender: gender?.trim() || '',
      position: position?.trim() || '',
      experienceType: experienceType?.trim() || '',
      currentCompany: currentCompany?.trim() || '',
      currentDesignation: currentDesignation?.trim() || '',
      experience: experience?.trim() || '',
      currentCTC: currentCTC || 0,
      expectedCTC: expectedCTC || 0,
      noticePeriod: noticePeriod?.trim() || '',
      highestQualification: highestQualification?.trim() || '',
      degree: degree?.trim() || '',
      domain: domain?.trim() || '',
      resume: req.file.filename,
      resumePath: `/upload_careers/${req.file.filename}`,
      heardFrom: heardFrom?.trim() || '',
      interestReason: interestReason?.trim() || ''
    });

    console.log("💾 Saving to database...");
    await newRegistration.save();
    console.log("✅ Application saved successfully:", newRegistration._id);

    res.status(201).json({
      success: true,
      message: "Application submitted successfully!",
      data: {
        id: newRegistration._id,
        position: newRegistration.position,
        appliedAt: newRegistration.createdAt
      }
    });

  } catch (error) {
    console.error("❌ REGISTRATION ERROR:");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    if (error.name === 'ValidationError') {
      console.error("Validation errors:", error.errors);
    }

    if (req.file) {
      try {
        const fs = await import('fs');
        const filePath = path.join(__dirname, '../upload_careers', req.file.filename);
        if (fs.existsSync(filePath)) {
          console.log("🗑️ Deleting uploaded file due to error");
          fs.unlinkSync(filePath);
        }
      } catch (fileError) {
        console.error("File deletion error:", fileError);
      }
    }

    res.status(500).json({
      success: false,
      message: "Error submitting application",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ✅ GET ALL APPLICATIONS (for admin)
router.get('/applications', async (req, res) => {
  try {
    const applications = await RegisterCareer.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: applications
    });
  } catch (error) {
    console.error("Get applications error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching applications"
    });
  }
});

// ✅ DEBUG ENDPOINT
router.get('/debug-info', async (req, res) => {
  try {
    const count = await RegisterCareer.countDocuments();
    const collections = await RegisterCareer.db.listCollections().toArray();
    
    res.json({
      success: true,
      database: RegisterCareer.db.databaseName,
      collection: 'registercareers',
      documentCount: count,
      availableCollections: collections.map(c => c.name)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ UPDATE APPLICATION ENDPOINT
router.put('/applications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedApplication = await RegisterCareer.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedApplication) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }

    res.json({
      success: true,
      message: "Application updated successfully",
      data: updatedApplication
    });

  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating application",
      error: error.message
    });
  }
});

// ✅ DELETE APPLICATION ENDPOINT
router.delete('/applications/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deletedApplication = await RegisterCareer.findByIdAndDelete(id);

    if (!deletedApplication) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }

    // Delete the resume file if it exists
    if (deletedApplication.resume) {
      const fs = await import('fs');
      const filePath = path.join(__dirname, '../upload_careers', deletedApplication.resume);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.json({
      success: true,
      message: "Application deleted successfully"
    });

  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting application",
      error: error.message
    });
  }
});

export default router;