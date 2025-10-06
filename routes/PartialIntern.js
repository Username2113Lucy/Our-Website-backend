import express from "express";
const router = express.Router();
import multer from "multer";
import path from "path";
import fs from "fs";
import PartialIntern from "../models/PartialIntern.js";

// Increase payload size limit
router.use(express.json({ limit: "50mb" }));
router.use(express.urlencoded({ extended: true, limit: "50mb" }));

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
    const originalName = path.parse(file.originalname).name; // Get filename without extension
    const extension = path.extname(file.originalname); // Get file extension
    cb(null, `${originalName}-${uniqueSuffix}${extension}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for resumes
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// POST: Save or update partial internship data - FIXED VERSION
router.post("/partial-save", upload.single("resume"), async (req, res) => {
  try {
    // ✅ DEBUG: Log incoming request data
    console.log("📥 Received partial-save request with body:", req.body);
    console.log("🎓 College details received:", {
      college: req.body.college,
      degree: req.body.degree, 
      department: req.body.department,
      year: req.body.year,
      rollNumber: req.body.rollNumber
    });
    console.log("📎 File received:", req.file ? req.file.originalname : "No file");

    const { email, rollNumber, ...rest } = req.body;

    if (!email) {
      // Delete uploaded file if validation fails
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // ✅ FIXED: Handle all form data properly, including college fields
    const cleanData = {};
    
    // Process all fields from the request
    Object.keys(rest).forEach(key => {
      // Handle array values (from multi-select or Listbox components)
      if (Array.isArray(rest[key])) {
        const nonEmptyValues = rest[key].filter(val => val && val.trim() !== "" && val !== "Select Gender" && val !== "Select City" && val !== "Select Degree" && val !== "Select Year" && val !== "Select Domain" && val !== "Select Duration" && val !== "Select Type");
        cleanData[key] = nonEmptyValues.length > 0 ? nonEmptyValues[nonEmptyValues.length - 1] : "";
      } else {
        // Handle string values - filter out "Select" placeholder values
        if (rest[key] && rest[key].trim() !== "" && 
            !rest[key].includes("Select Gender") &&
            !rest[key].includes("Select City") &&
            !rest[key].includes("Select Degree") && 
            !rest[key].includes("Select Year") &&
            !rest[key].includes("Select Domain") &&
            !rest[key].includes("Select Duration") &&
            !rest[key].includes("Select Type")) {
          cleanData[key] = rest[key];
        } else {
          cleanData[key] = ""; // Set empty for placeholder values
        }
      }
    });

    // ✅ FIXED: Ensure college fields are explicitly included
    // These are the critical academic fields that might be getting lost
    const academicFields = ['college', 'degree', 'department', 'year', 'rollNumber'];
    academicFields.forEach(field => {
      if (req.body[field] && req.body[field].trim() !== "" && !req.body[field].includes('Select')) {
        cleanData[field] = req.body[field];
      }
    });

    console.log("🧹 Cleaned data for saving:", cleanData);
    console.log("🎓 Final college details to save:", {
      college: cleanData.college,
      degree: cleanData.degree,
      department: cleanData.department,
      year: cleanData.year,
      rollNumber: cleanData.rollNumber
    });

    let partial = await PartialIntern.findOne({ email });

    // ✅ Handle file upload properly
    let resumeData = null;
    if (req.file) {
      resumeData = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
        uploadDirectory: uploadDir,
        mimetype: req.file.mimetype
      };
      console.log("📁 Resume file data:", resumeData);
    }

    if (!partial) {
      // Create new record
      console.log("🆕 Creating new PartialIntern record for:", email);
      partial = new PartialIntern({ 
        email, 
        rollNumber: rollNumber || undefined,
        ...cleanData,
        resume: resumeData
      });
    } else {
      // Update existing record
      console.log("🔄 Updating existing PartialIntern record for:", email);
      
      // Update all fields from cleanData
      Object.keys(cleanData).forEach((key) => {
        if (cleanData[key] !== undefined && cleanData[key] !== "") {
          partial[key] = cleanData[key];
        }
      });
      
      // Only update rollNumber if provided and valid
      if (rollNumber && rollNumber.trim() !== "" && !rollNumber.includes('Select')) {
        partial.rollNumber = rollNumber;
      }
      
      // Update resume if file was uploaded
      if (resumeData) {
        // Delete old resume file if exists
        if (partial.resume && partial.resume.path && fs.existsSync(partial.resume.path)) {
          try {
            fs.unlinkSync(partial.resume.path);
            console.log("🗑️ Deleted old resume file");
          } catch (fileErr) {
            console.warn("⚠️ Could not delete old resume file:", fileErr.message);
          }
        }
        partial.resume = resumeData;
      }
    }

    // ✅ Save to database
    await partial.save();
    console.log("✅ Successfully saved PartialIntern data for:", email);
    
    res.status(200).json({ 
      success: true, 
      message: "Partial data saved successfully",
      data: {
        id: partial._id,
        email: partial.email,
        college: partial.college,
        degree: partial.degree,
        department: partial.department,
        year: partial.year,
        rollNumber: partial.rollNumber
      }
    });
    
  } catch (err) {
    // Delete uploaded file if error occurs
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
        console.log("🗑️ Deleted uploaded file due to error");
      } catch (fileErr) {
        console.warn("⚠️ Could not delete uploaded file:", fileErr.message);
      }
    }
    
    console.error("❌ Error in /partial-save:", err.message);
    console.error("🔍 Error details:", err);
    
    // ✅ Handle duplicate key errors specifically
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({ 
        success: false, 
        message: `Duplicate entry found for ${field}. Please use a different ${field}.` 
      });
    }
    
    // ✅ Handle validation errors
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map(e => e.message);
      console.error("📋 Validation errors:", validationErrors);
      return res.status(400).json({ 
        success: false, 
        message: "Validation failed", 
        errors: validationErrors 
      });
    }
    
    // ✅ Handle Cast errors (invalid ObjectId, etc.)
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid ${err.path}: ${err.value}` 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Server error: " + err.message 
    });
  }
});

// GET: Fetch partial data (all or by email)
router.get("/partial-data", async (req, res) => {
  try {
    const { email } = req.query;
    let result;

    if (email) {
      result = await PartialIntern.findOne({ email });
      if (!result) {
        return res.status(404).json({ success: false, message: "No record found" });
      }
    } else {
      result = await PartialIntern.find().sort({ createdAt: -1 });
    }

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("❌ Error in /partial-data:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET: Download resume
router.get("/resume/:id", async (req, res) => {
  try {
    const partial = await PartialIntern.findById(req.params.id);
    if (!partial || !partial.resume || !partial.resume.path) {
      return res.status(404).json({ success: false, message: "Resume not found" });
    }

    if (!fs.existsSync(partial.resume.path)) {
      return res.status(404).json({ success: false, message: "Resume file not found on server" });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${partial.resume.originalName}"`);
    res.sendFile(path.resolve(partial.resume.path));
  } catch (err) {
    console.error("❌ Error fetching resume:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// PUT: Update partial data by ID
router.put("/partial-update/:id", upload.single("resume"), async (req, res) => {
  try {
    console.log("🔄 Update request for ID:", req.params.id);
    console.log("📤 Update data:", req.body);

    // ✅ Handle array values from frontend
    const cleanData = {};
    Object.keys(req.body).forEach(key => {
      if (Array.isArray(req.body[key])) {
        const nonEmptyValues = req.body[key].filter(val => val && val.trim() !== "" && !val.includes('Select'));
        cleanData[key] = nonEmptyValues.length > 0 ? nonEmptyValues[nonEmptyValues.length - 1] : "";
      } else {
        if (req.body[key] && req.body[key].trim() !== "" && !req.body[key].includes('Select')) {
          cleanData[key] = req.body[key];
        }
      }
    });

    // ✅ Handle file upload properly
    if (req.file) {
      cleanData.resume = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
        uploadDirectory: uploadDir,
        mimetype: req.file.mimetype
      };
    }

    const updated = await PartialIntern.findByIdAndUpdate(
      req.params.id, 
      cleanData, 
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updated) {
      // Delete uploaded file if record not found
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    console.log("✅ Successfully updated record:", updated._id);
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    // Delete uploaded file if error occurs
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error("❌ Error in /partial-update:", err.message);
    
    // ✅ Handle duplicate key errors
    if (err.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: "Duplicate entry found. Please check your data." 
      });
    }
    
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// DELETE: Delete partial data by ID
router.delete("/partial-delete/:id", async (req, res) => {
  try {
    const partial = await PartialIntern.findById(req.params.id);
    if (!partial) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    // Delete resume file if exists
    if (partial.resume && partial.resume.path && fs.existsSync(partial.resume.path)) {
      fs.unlinkSync(partial.resume.path);
    }

    await PartialIntern.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    console.error("❌ Error in /partial-delete:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;