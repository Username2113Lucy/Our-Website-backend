import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import InternEntriesRouter from "./routes/InternEntries.js";
import RDProjectsRouter from "./routes/RDprojects.js";
import courseRoutes from "./routes/CourseReg.js";
import PartialRDRouter from "./routes/PartialRD.js";
import InternshipRouter from "./routes/RegisterIntern.js";
import PartialInternRouter from "./routes/PartialIntern.js";
import dotenv from "dotenv";
dotenv.config(); 

const app = express();

// ✅ CORRECTED CORS CONFIGURATION
app.use(cors({
  origin: [
    'https://www.vetriantechnologysolutions.in',
    'https://vetriantechnologysolutions.in',
    'http://localhost:5173',
    'http://localhost:5174', 
    'http://localhost:3000',
    process.env.FRONTEND_URL, // Keep this if you have it in env
    process.env.ADMIN_URL,    // Keep this if you have it in env
  ].filter(Boolean), // Removes any undefined values
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // ✅ ADD THIS
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'] // ✅ ADD THIS
}));

// ✅ Handle preflight requests globally
app.options('*', cors()); // ✅ ADD THIS LINE

app.use(express.json());
console.log(process.env.MONGODB_URI,"urii" || "mongodb://127.0.0.1:27017/internshipDB");

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

// ✅ Health check route
app.get("/", (req, res) => {
  res.json({ message: "R&D Backend API is running!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));