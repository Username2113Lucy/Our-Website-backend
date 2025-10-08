import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import RegisterIntern from "../models/RegisterIntern.js";

const router = express.Router();

// Ensure upload_intern directory exists
const uploadDir = "upload_intern";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer setup for file storage with original names
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Save with original filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const originalName = path.parse(file.originalname).name;
    const extension = path.extname(file.originalname);
    cb(null, `${originalName}-${uniqueSuffix}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// POST: Register Internship
router.post("/registration", upload.single("resume"), async (req, res) => {
  try {
    // ✅ Validate required fields
    const requiredFields = ['fullName', 'email', 'phone', 'gender', 'city', 'dob', 'college', 'degree', 'department', 'year', 'domain', 'duration', 'internshipType', 'startDate', 'interestReason', 'skills', 'agreement', 'accessPreference'];
    
    const missingFields = requiredFields.filter(field => !req.body[field] || req.body[field].toString().trim() === "");
    
    if (missingFields.length > 0) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ 
        success: false, 
        message: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }

    // if (!req.file) {
    //   return res.status(400).json({ 
    //     success: false, 
    //     message: "Resume file is required" 
    //   });
    // }

    // ✅ Ensure rollNumber has a value to prevent null
    const rollNumber = req.body.rollNumber && req.body.rollNumber.trim() !== "" 
      ? req.body.rollNumber 
      : `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newInternship = new RegisterIntern({
  // Personal Information
  fullName: req.body.fullName,
  email: req.body.email,
  phone: req.body.phone,
  gender: req.body.gender,
  city: req.body.city,
  dob: req.body.dob,
  
  // Academic Information
  college: req.body.college,
  degree: req.body.degree,
  department: req.body.department,
  year: req.body.year,
  rollNumber: rollNumber,
  
  // Internship Information
  domain: req.body.domain,
  duration: req.body.duration,
  internshipType: req.body.internshipType,
  startDate: req.body.startDate,
  interestReason: req.body.interestReason,
  skills: req.body.skills,
  previousExperience: req.body.previousExperience || "",
  expectations: req.body.expectations || "",
  
  // Referral Codes
  referralCode: req.body.referralCode || "",
  yourReferralCode: req.body.yourReferralCode || "",
  
  // Agreement & Source
  heardFrom: req.body.heardFrom || "",
  agreement: req.body.agreement === "true" || req.body.agreement === true,
  
  // Payment/Access Preference
  accessPreference: req.body.accessPreference,
  additionalComments: req.body.additionalComments || "",
  
  // File upload
  resume: {
    filename: req.file.filename,
    originalName: req.file.originalname,
    path: req.file.path,
    size: req.file.size
  },
  resumePath: req.file.path,
  uploadDirectory: uploadDir,
  
  // Admin Panel Columns
  notes: "",
  totalCost: 0,
  amountPaid: 0,
  status: "Not Viewed"
});

    const savedInternship = await newInternship.save();
    res.status(200).json({ success: true, message: "Internship registration successful", data: savedInternship });
  } catch (error) {
    // Delete uploaded file if error occurs
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error("Error saving internship:", error);
    
    // ✅ Improved duplicate key error handling
    if (error.code === 11000) {
      let duplicateField = "data";
      let duplicateValue = "unknown";
      
      if (error.keyValue) {
        if (error.keyValue.email) {
          duplicateField = "email";
          duplicateValue = error.keyValue.email;
        } else if (error.keyValue.phone) {
          duplicateField = "phone number";
          duplicateValue = error.keyValue.phone;
        } else if (error.keyValue.rollNumber) {
          duplicateField = "roll number";
          duplicateValue = error.keyValue.rollNumber;
        }
      }
      
      return res.status(400).json({ 
        success: false, 
        message: `Duplicate ${duplicateField} found: ${duplicateValue}. Please use different ${duplicateField}.` 
      });
    }
    
    // ✅ Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false, 
        message: "Validation failed", 
        errors: errors 
      });
    }
    
    res.status(500).json({ success: false, message: "Registration failed", error: error.message });
  }
});

// GET: Fetch all Internship Registrations
router.get("/registration", async (req, res) => {
  try {
    const internships = await RegisterIntern.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, message: "Internships fetched successfully", data: internships });
  } catch (error) {
    console.error("Error fetching internships:", error);
    res.status(500).json({ success: false, message: "Failed to fetch internships", error: error.message });
  }
});

// GET: Fetch single internship by ID
router.get("/registration/:id", async (req, res) => {
  try {
    const internship = await RegisterIntern.findById(req.params.id);
    if (!internship) return res.status(404).json({ success: false, message: "Internship not found" });
    res.status(200).json({ success: true, data: internship });
  } catch (error) {
    console.error("Error fetching internship:", error);
    res.status(500).json({ success: false, message: "Failed to fetch internship", error: error.message });
  }
});

// PUT: Update Internship by ID
router.put("/registration/:id", upload.single("resume"), async (req, res) => {
  try {
    const updateData = { ...req.body };

    // Handle file upload
    if (req.file) {
      updateData.resume = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size
      };
      updateData.resumePath = req.file.path;
    }

    // Handle boolean conversion
    if (req.body.agreement !== undefined) {
      updateData.agreement = req.body.agreement === "true" || req.body.agreement === true;
    }

    const updatedInternship = await RegisterIntern.findByIdAndUpdate(
      req.params.id, 
      { $set: updateData }, 
      { 
        new: true, 
        runValidators: true,
        context: 'query'
      }
    );

    if (!updatedInternship) {
      // Delete uploaded file if record not found
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ success: false, message: "Internship not found" });
    }

    res.status(200).json({ success: true, message: "Internship updated successfully", data: updatedInternship });
  } catch (error) {
    // Delete uploaded file if error occurs
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error("Error updating internship:", error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: "Duplicate data found. Please check your input." 
      });
    }
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false, 
        message: "Validation failed", 
        errors: errors 
      });
    }
    
    res.status(500).json({ success: false, message: "Failed to update internship", error: error.message });
  }
});

// DELETE: Remove an internship by ID
router.delete("/registration/:id", async (req, res) => {
  try {
    const internship = await RegisterIntern.findById(req.params.id);
    if (!internship) return res.status(404).json({ success: false, message: "Internship not found" });

    // Delete resume file if exists
    if (internship.resume && internship.resume.path && fs.existsSync(internship.resume.path)) {
      fs.unlinkSync(internship.resume.path);
    }

    await RegisterIntern.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Internship deleted successfully" });
  } catch (error) {
    console.error("Error deleting internship:", error);
    res.status(500).json({ success: false, message: "Failed to delete internship", error: error.message });
  }
});

// POST: Check for duplicate entries
router.post("/check-duplicate", async (req, res) => {
  try {
    const { email, phone, rollNumber } = req.body;
    
    if (!email && !phone && !rollNumber) {
      return res.status(400).json({ 
        success: false, 
        message: "At least one field (email, phone, or rollNumber) is required" 
      });
    }

    const query = {
      $or: []
    };

    if (email && email.trim() !== "") query.$or.push({ email: email.trim().toLowerCase() });
    if (phone && phone.trim() !== "") query.$or.push({ phone: phone.trim() });
    if (rollNumber && rollNumber.trim() !== "") query.$or.push({ rollNumber: rollNumber.trim() });

    if (query.$or.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "No valid fields provided for duplicate check" 
      });
    }

    const exists = await RegisterIntern.findOne(query);
    res.json({ 
      success: true, 
      exists: !!exists,
      duplicateFields: exists ? Object.keys(exists._doc).filter(key => 
        (email && exists[key] === email.trim().toLowerCase()) ||
        (phone && exists[key] === phone.trim()) ||
        (rollNumber && exists[key] === rollNumber.trim())
      ) : []
    });
  } catch (error) {
    console.error("Error checking duplicate:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to check duplicates", 
      error: error.message 
    });
  }
});

// GET: Download resume
router.get("/resume/:id", async (req, res) => {
  try {
    const internship = await RegisterIntern.findById(req.params.id);
    if (!internship || !internship.resume || !internship.resume.path) {
      return res.status(404).json({ success: false, message: "Resume not found" });
    }

    if (!fs.existsSync(internship.resume.path)) {
      return res.status(404).json({ success: false, message: "Resume file not found on server" });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${internship.resume.originalName}"`);
    res.sendFile(path.resolve(internship.resume.path));
  } catch (error) {
    console.error("Error fetching resume:", error);
    res.status(500).json({ success: false, message: "Failed to fetch resume", error: error.message });
  }
});

export default router;