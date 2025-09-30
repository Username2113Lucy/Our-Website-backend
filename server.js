import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import InternEntriesRouter from "./routes/InternEntries.js";
import RDProjectsRouter from "./routes/RDprojects.js"; // new router
import courseRoutes from "./routes/CourseReg.js";
import PartialRDRouter from "./routes/PartialRD.js";
import dotenv from "dotenv";
dotenv.config(); 

const app = express();

// ✅ UPDATED CORS CONFIGURATION
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    process.env.ADMIN_URL,
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "https://your-frontend.vercel.app"  // Your future frontend URL
  ],
  credentials: true
}));

app.use(express.json());
console.log(process.env.MONGODB_URI,"urii");

// ✅ UPDATED MongoDB connection (using environment variable)
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000,
})
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("❌ MongoDB connection error:", err));

// Use routers
app.use("/InternEntries", InternEntriesRouter);
app.use("/RDprojects", RDProjectsRouter); // mount at /RD_projects
app.use("/Courses", courseRoutes);
app.use("/partialRD", PartialRDRouter); // Now /RDprojects/partial-save works

// ✅ ADD health check route
app.get("/", (req, res) => {
  res.json({ message: "R&D Backend API is running!" });
});

// ✅ UPDATED Server port (using environment variable)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));