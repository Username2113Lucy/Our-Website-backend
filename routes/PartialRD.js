import express from "express";
const router = express.Router();
import multer from "multer";
import Partial from "../models/PartialRD.js";

// Increase payload size limit
router.use(express.json({ limit: "50mb" }));
router.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Multer setup
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024, fieldSize: 50 * 1024 * 1024 }
});

// POST: Save or update partial data
router.post("/partial-save", upload.single("proposal"), async (req, res) => {
  try {
    const { email, rollNumber, ...rest } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // ✅ Fix: Handle array values from frontend
    const cleanData = {};
    Object.keys(rest).forEach(key => {
      if (Array.isArray(rest[key])) {
        // Take the last non-empty value from the array
        const nonEmptyValues = rest[key].filter(val => val && val.trim() !== "");
        cleanData[key] = nonEmptyValues.length > 0 ? nonEmptyValues[nonEmptyValues.length - 1] : "";
      } else {
        cleanData[key] = rest[key];
      }
    });

    // ✅ Ensure projectTitle has a proper value
    if (!cleanData.projectTitle || cleanData.projectTitle.trim() === "") {
      cleanData.projectTitle = "Project Title Not Provided";
    }

    let partial = await Partial.findOne({ email });

    // Convert accessPreference → projectAccess
    if (cleanData.accessPreference) {
      if (cleanData.accessPreference === "Full Access") {
        cleanData.projectAccess = "Full Access (One-time payment)";
      } else if (cleanData.accessPreference === "Flexible Access") {
        cleanData.projectAccess = "Flexible Access (Installment / Due-based option)";
      }
    }

    // ✅ Handle file upload properly
    let proposalData = null;
    if (req.file) {
      proposalData = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
        filename: req.file.originalname,
        size: req.file.size
      };
    }

    if (!partial) {
      partial = new Partial({ 
        email, 
        rollNumber: rollNumber || undefined,
        ...cleanData,
        proposal: proposalData
      });
    } else {
      Object.keys(cleanData).forEach((key) => {
        if (cleanData[key] !== undefined && cleanData[key] !== "") {
          partial[key] = cleanData[key];
        }
      });
      
      // Only update rollNumber if provided
      if (rollNumber && rollNumber.trim() !== "") {
        partial.rollNumber = rollNumber;
      }
      
      // Update proposal if file was uploaded
      if (proposalData) {
        partial.proposal = proposalData;
      }
    }

    await partial.save();
    res.status(200).json({ success: true, message: "Partial data saved", data: partial });
  } catch (err) {
    console.error("❌ Error in /partial-save:", err.message);
    console.error("Error details:", err);
    
    // ✅ Handle duplicate key errors specifically
    if (err.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: "Duplicate entry found. Please check your email, phone, or roll number." 
      });
    }
    
    // ✅ Handle validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: "Validation failed", 
        errors: Object.values(err.errors).map(e => e.message) 
      });
    }
    
    res.status(500).json({ success: false, message: "Server error: " + err.message });
  }
});

// GET: Fetch partial data (all or by email)
router.get("/partial-data", async (req, res) => {
  try {
    const { email } = req.query;
    let result;

    if (email) {
      result = await Partial.findOne({ email });
      if (!result) {
        return res.status(404).json({ success: false, message: "No record found" });
      }
    } else {
      result = await Partial.find().select('-proposal.data'); // Exclude file data by default
    }

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("❌ Error in /partial-data:", err.message);
    res.status(500).json({ success: false, message: err });
  }
});

// GET: Download proposal PDF
router.get("/proposal/:id", async (req, res) => {
  try {
    const partial = await Partial.findById(req.params.id);
    if (!partial || !partial.proposal || !partial.proposal.data) {
      return res.status(404).json({ success: false, message: "Proposal not found" });
    }

    res.setHeader('Content-Type', partial.proposal.contentType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="proposal-${req.params.id}.pdf"`);
    res.send(partial.proposal.data);
  } catch (err) {
    console.error("❌ Error fetching proposal:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// PUT: Update partial data by ID
router.put("/partial-update/:id", upload.single("proposal"), async (req, res) => {
  try {
    // ✅ Fix: Handle array values from frontend
    const cleanData = {};
    Object.keys(req.body).forEach(key => {
      if (Array.isArray(req.body[key])) {
        const nonEmptyValues = req.body[key].filter(val => val && val.trim() !== "");
        cleanData[key] = nonEmptyValues.length > 0 ? nonEmptyValues[nonEmptyValues.length - 1] : "";
      } else {
        cleanData[key] = req.body[key];
      }
    });

    // ✅ Ensure projectTitle has a proper value
    if (!cleanData.projectTitle || cleanData.projectTitle.trim() === "") {
      cleanData.projectTitle = "Project Title Not Provided";
    }

    if (cleanData.accessPreference) {
      if (cleanData.accessPreference === "Full Access") {
        cleanData.projectAccess = "Full Access (One-time payment)";
      } else if (cleanData.accessPreference === "Flexible Access") {
        cleanData.projectAccess = "Flexible Access (Installment / Due-based option)";
      }
    }

    // ✅ Handle file upload properly
    if (req.file) {
      cleanData.proposal = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
        filename: req.file.originalname,
        size: req.file.size
      };
    }

    const updated = await Partial.findByIdAndUpdate(req.params.id, cleanData, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    res.status(200).json({ success: true, data: updated });
  } catch (err) {
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
    const deleted = await Partial.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }
    res.status(200).json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    console.error("❌ Error in /partial-delete:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;