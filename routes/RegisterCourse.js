import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import RegisterCourse from "../models/RegisterCourse.js";

const router = express.Router();

// Ensure upload_courses directory exists
const uploadDir = "upload_courses";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer setup for file storage with original names
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
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

// POST: Register Course
router.post("/registration", upload.single("resume"), async (req, res) => {
  try {
    // ✅ Validate required fields
    const requiredFields = ['fullName', 'email', 'phone', 'gender', 'city', 'dob', 'college', 'degree', 'department', 'year', 'rollNumber', 'courseName', 'courseDuration', 'learningMode', 'preferredTimeSlot', 'courseLevel', 'heardFrom', 'agreement', 'accessPreference'];
    
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

    const newCourse = new RegisterCourse({
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
      rollNumber: req.body.rollNumber,
      
      // Course Information
      courseName: req.body.courseName,
      courseDuration: req.body.courseDuration,
      learningMode: req.body.learningMode,
      preferredTimeSlot: req.body.preferredTimeSlot,
      courseLevel: req.body.courseLevel,
      previousExperience: req.body.previousExperience || "",
      additionalComments: req.body.additionalComments || "",
      
      // Referral Codes
      referralCode: req.body.referralCode || "",
      yourReferralCode: req.body.yourReferralCode || "",
      
      // Agreement & Source
      heardFrom: req.body.heardFrom,
      agreement: req.body.agreement === "true" || req.body.agreement === true,
      
      // Payment/Access Preference
      accessPreference: req.body.accessPreference,
      
      // File upload
      resume: req.file ? {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size
      } : undefined,
      resumePath: req.file ? req.file.path : "",
      uploadDirectory: uploadDir,
      
      // Admin Panel Columns
      notes: "",
      totalCost: 0,
      amountPaid: 0,
      status: "Not Viewed"
    });

    const savedCourse = await newCourse.save();
    res.status(200).json({ success: true, message: "Course registration successful", data: savedCourse });
  } catch (error) {
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error("Error saving course:", error);
    
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

// GET: Fetch all Course Registrations
router.get("/registration", async (req, res) => {
  try {
    const courses = await RegisterCourse.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, message: "Courses fetched successfully", data: courses });
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ success: false, message: "Failed to fetch courses", error: error.message });
  }
});

// GET: Fetch single course by ID
router.get("/registration/:id", async (req, res) => {
  try {
    const course = await RegisterCourse.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });
    res.status(200).json({ success: true, data: course });
  } catch (error) {
    console.error("Error fetching course:", error);
    res.status(500).json({ success: false, message: "Failed to fetch course", error: error.message });
  }
});

// PUT: Update Course by ID
router.put("/registration/:id", upload.single("resume"), async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (req.file) {
      updateData.resume = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size
      };
      updateData.resumePath = req.file.path;
    }

    if (req.body.agreement !== undefined) {
      updateData.agreement = req.body.agreement === "true" || req.body.agreement === true;
    }

    const updatedCourse = await RegisterCourse.findByIdAndUpdate(
      req.params.id, 
      { $set: updateData }, 
      { 
        new: true, 
        runValidators: true,
        context: 'query'
      }
    );

    if (!updatedCourse) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    res.status(200).json({ success: true, message: "Course updated successfully", data: updatedCourse });
  } catch (error) {
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error("Error updating course:", error);
    
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
    
    res.status(500).json({ success: false, message: "Failed to update course", error: error.message });
  }
});

// DELETE: Remove a course by ID
router.delete("/registration/:id", async (req, res) => {
  try {
    const course = await RegisterCourse.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    if (course.resume && course.resume.path && fs.existsSync(course.resume.path)) {
      fs.unlinkSync(course.resume.path);
    }

    await RegisterCourse.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Course deleted successfully" });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({ success: false, message: "Failed to delete course", error: error.message });
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

    const exists = await RegisterCourse.findOne(query);
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
    const course = await RegisterCourse.findById(req.params.id);
    if (!course || !course.resume || !course.resume.path) {
      return res.status(404).json({ success: false, message: "Resume not found" });
    }

    if (!fs.existsSync(course.resume.path)) {
      return res.status(404).json({ success: false, message: "Resume file not found on server" });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${course.resume.originalName}"`);
    res.sendFile(path.resolve(course.resume.path));
  } catch (error) {
    console.error("Error fetching resume:", error);
    res.status(500).json({ success: false, message: "Failed to fetch resume", error: error.message });
  }
});

export default router;