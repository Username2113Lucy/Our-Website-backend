import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import InternEntriesRouter from "./routes/InternEntries.js";
import RDProjectsRouter from "./routes/RDprojects.js";
import courseRoutes from "./routes/CourseReg.js";
import PartialRDRouter from "./routes/PartialRD.js";
import InternshipRouter from "./routes/RegisterIntern.js";
import PartialInternRouter from "./routes/PartialIntern.js";
import IdeaForgeRouter from "./routes/Ideaforge.js"
import RegisterCareerRouter from "./routes/RegisterCareer.js";
import dotenv from "dotenv";
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// ✅ NEW: Import Course Routes
import RegisterCourseRouter from "./routes/RegisterCourse.js";
import PartialCourseRouter from "./routes/PartialCourse.js";

dotenv.config(); 

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ CORS
app.use(cors({
  origin: [
    'https://www.vetriantechnologysolutions.in',
    'https://vetriantechnologysolutions.in',
    'https://our-website-admin.vercel.app',
    'https://admin.vetriantechnologysolutions.in',
    'http://localhost:5173',
    'http://localhost:5174', 
    'http://localhost:3000',
  ],
  credentials: true
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ✅ MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000,
})
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("❌ MongoDB connection error:", err));

// Use routers
app.use("/InternEntries", InternEntriesRouter);
app.use("/RDprojects", RDProjectsRouter);
app.use("/Courses", courseRoutes);
app.use("/partialRD", PartialRDRouter);
app.use("/RegisterIntern", InternshipRouter);
app.use("/PartialIntern", PartialInternRouter);
app.use("/Ideaforge", IdeaForgeRouter);

// ✅ NEW: Add Course Routes
app.use("/RegisterCourse", RegisterCourseRouter);
app.use("/PartialCourse", PartialCourseRouter);
app.use("/RegisterCareer", RegisterCareerRouter);

// ✅ FIXED: Serve static files from upload_intern directory
const uploadInternPath = path.join(__dirname, 'upload_intern');
console.log("📁 Upload intern path:", uploadInternPath);

// Check if directory exists, create if it doesn't
if (!fs.existsSync(uploadInternPath)) {
  console.log("📁 Creating upload_intern directory...");
  fs.mkdirSync(uploadInternPath, { recursive: true });
}

// ✅ FIXED: Serve static files for internships
app.use('/upload_intern', express.static(uploadInternPath, {
  dotfiles: 'deny',
  index: false // Don't serve directory listings
}));

// ✅ FIXED: Serve static files from upload_careers directory
const uploadCareersPath = path.join(__dirname, 'upload_careers');
console.log("📁 Upload careers path:", uploadCareersPath);

// Check if directory exists, create if it doesn't
if (!fs.existsSync(uploadCareersPath)) {
  console.log("📁 Creating upload_careers directory...");
  fs.mkdirSync(uploadCareersPath, { recursive: true });
}

// Serve static files for careers
app.use('/upload_careers', express.static(uploadCareersPath, {
  dotfiles: 'deny',
  index: false
}));

// ✅ NEW: Serve static files from upload_courses directory
const uploadCoursesPath = path.join(__dirname, 'upload_courses');
console.log("📁 Upload courses path:", uploadCoursesPath);

// Check if directory exists, create if it doesn't
if (!fs.existsSync(uploadCoursesPath)) {
  console.log("📁 Creating upload_courses directory...");
  fs.mkdirSync(uploadCoursesPath, { recursive: true });
}

// Serve static files for courses
app.use('/upload_courses', express.static(uploadCoursesPath, {
  dotfiles: 'deny',
  index: false
}));

// ✅ DEBUG ROUTE: List files in upload_intern
app.get('/debug-files', (req, res) => {
  try {
    const files = fs.readdirSync(uploadInternPath);
    res.json({
      path: uploadInternPath,
      fileCount: files.length,
      files: files
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      path: uploadInternPath,
      exists: fs.existsSync(uploadInternPath)
    });
  }
});

// ✅ DEBUG ROUTE: List files in upload_courses
app.get('/debug-courses-files', (req, res) => {
  try {
    const files = fs.readdirSync(uploadCoursesPath);
    res.json({
      path: uploadCoursesPath,
      fileCount: files.length,
      files: files
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      path: uploadCoursesPath,
      exists: fs.existsSync(uploadCoursesPath)
    });
  }
});

// ✅ NEW: DEBUG ROUTE: List files in upload_careers
app.get('/debug-careers-files', (req, res) => {
  try {
    const files = fs.readdirSync(uploadCareersPath);
    res.json({
      path: uploadCareersPath,
      fileCount: files.length,
      files: files
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      path: uploadCareersPath,
      exists: fs.existsSync(uploadCareersPath)
    });
  }
});

// ✅ HEALTH CHECK ROUTE
app.get("/", (req, res) => {
  res.json({ 
    message: "Vetrian Technology Solutions Backend API is running!",
    version: "1.0.0",
    endpoints: {
      internship: {
        register: "/RegisterIntern",
        partial: "/PartialIntern"
      },
      courses: {
        register: "/RegisterCourse",
        partial: "/PartialCourse"
      },
      careers: {
        register: "/RegisterCareer"
      },
      rnd: "/RDprojects",
      ideaForge: "/Ideaforge"
    },
    timestamp: new Date().toISOString()
  });
});

// ✅ PING ENDPOINT
app.get('/ping', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Backend is awake and running',
    services: {
      database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
      upload_intern: fs.existsSync(uploadInternPath),
      upload_courses: fs.existsSync(uploadCoursesPath),
      upload_careers: fs.existsSync(uploadCareersPath)
    }
  });
});

// ✅ ERROR HANDLING MIDDLEWARE
app.use((error, req, res, next) => {
  console.error('Unhandled Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// ✅ FIXED: 404 HANDLER - Use proper Express 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 Available Routes:`);
  console.log(`   • Internship Registration: /RegisterIntern`);
  console.log(`   • Partial Internship: /PartialIntern`);
  console.log(`   • Course Registration: /RegisterCourse`);
  console.log(`   • Partial Course: /PartialCourse`);
  console.log(`   • Career Registration: /RegisterCareer`);
  console.log(`   • R&D Projects: /RDprojects`);
  console.log(`   • Idea Forge: /Ideaforge`);
  console.log(`   • File Uploads: /upload_intern, /upload_courses, /upload_careers`);
  console.log(`   • Debug Routes: /debug-files, /debug-courses-files, /debug-careers-files`);
});