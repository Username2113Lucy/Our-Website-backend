import express from "express";
import multer from "multer";
import path from "path";
import RDProject from "../models/RDprojects.js"; 

const router = express.Router();

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"), 
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// POST: Register R&D Project
router.post("/registration", upload.single("proposal"), async (req, res) => {
  try {
    // ✅ Validate required fields
    if (!req.body.projectTitle || req.body.projectTitle.trim() === "") {
      return res.status(400).json({ 
        success: false, 
        message: "Project title is required" 
      });
    }

    // ✅ Ensure rollNumber has a value to prevent null
    const rollNumber = req.body.rollNumber && req.body.rollNumber.trim() !== "" 
      ? req.body.rollNumber 
      : `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const projectAccessValue =
      req.body.accessPreference === "Full Access"
        ? "Full Access (One-time payment)"
        : req.body.accessPreference === "Flexible Access"
        ? "Flexible Access (Installment / Due-based option)"
        : req.body.accessPreference;

    const newProject = new RDProject({
      fullName: req.body.fullName,
      email: req.body.email,
      phone: req.body.phone,
      gender: req.body.gender,
      city: req.body.city,
      dob: req.body.dob,
      college: req.body.college,
      degree: req.body.degree,
      department: req.body.department,
      year: req.body.year,
      rollNumber: rollNumber, // ✅ Use the ensured rollNumber
      projectDomain: req.body.domain,
      projectTitle: req.body.projectTitle,
      stage: req.body.stage || "Idea",
      teamType: req.body.teamType,
      teamMembers: req.body.teamMembers || "",
      shortDesc: req.body.shortDesc || "",
      supervisor: req.body.supervisor || "",
      skills: req.body.skills || "",
      abstractFile: req.file ? req.file.path : "",
      projectAccess: projectAccessValue,
      accessPreference: req.body.accessPreference,
      additionalComments: req.body.additionalComments || "",
      heardFrom: req.body.heardFrom || "",
      referralCode: req.body.referralCode || "",
      yourReferralCode: req.body.yourReferralCode || "",
      agreement: req.body.agreement === "true" || req.body.agreement === true,
    });

    const savedProject = await newProject.save();
    res.status(200).json({ success: true, message: "Registration successful", data: savedProject });
  } catch (error) {
    console.error("Error saving project:", error);
    
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

// GET: Fetch all R&D Projects
router.get("/registration", async (req, res) => {
  try {
    const projects = await RDProject.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, message: "Projects fetched successfully", data: projects });
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ success: false, message: "Failed to fetch projects", error: error.message });
  }
});

// GET: Fetch single project by ID
router.get("/registration/:id", async (req, res) => {
  try {
    const project = await RDProject.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });
    res.status(200).json({ success: true, data: project });
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ success: false, message: "Failed to fetch project", error: error.message });
  }
});

// PUT: Update Project by ID
router.put("/registration/:id", upload.single("proposal"), async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (req.file) updateData.abstractFile = req.file.path;

    if (req.body.accessPreference) {
      updateData.projectAccess =
        req.body.accessPreference === "Full Access"
          ? "Full Access (One-time payment)"
          : req.body.accessPreference === "Flexible Access"
          ? "Flexible Access (Installment / Due-based option)"
          : req.body.accessPreference;
    }

    if (req.body.agreement !== undefined) {
      updateData.agreement = req.body.agreement === "true" || req.body.agreement === true;
    }

    const updatedProject = await RDProject.findByIdAndUpdate(
      req.params.id, 
      { $set: updateData }, 
      { 
        new: true, 
        runValidators: true,
        context: 'query'
      }
    );

    if (!updatedProject) return res.status(404).json({ success: false, message: "Project not found" });

    res.status(200).json({ success: true, message: "Project updated successfully", data: updatedProject });
  } catch (error) {
    console.error("Error updating project:", error);
    
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
    
    res.status(500).json({ success: false, message: "Failed to update project", error: error.message });
  }
});

// DELETE: Remove a project by ID
router.delete("/registration/:id", async (req, res) => {
  try {
    const project = await RDProject.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });
    res.status(200).json({ success: true, message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ success: false, message: "Failed to delete project", error: error.message });
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

    const exists = await RDProject.findOne(query);
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

export default router;