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

// ✅ SIMPLE CORS THAT ALWAYS WORKS
app.use(cors({
  origin: [
    'https://www.vetriantechnologysolutions.in',
    'https://vetriantechnologysolutions.in',
    'http://localhost:5173',
    'http://localhost:5174', 
    'http://localhost:3000',
  ],
  credentials: true
}));

// ❌ REMOVE THIS LINE COMPLETELY: app.options('*', cors());

app.use(express.json());

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

// ✅ HEALTH CHECK ROUTE
app.get("/", (req, res) => {
  res.json({ message: "R&D Backend API is running!" });
});

// ✅ PING ENDPOINT
app.get('/ping', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Backend is awake and running'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));