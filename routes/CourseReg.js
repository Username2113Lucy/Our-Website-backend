import express from "express";
import CourseRegistration from "../models/CourseReg.js"; // adjust path

const router = express.Router();


// ✅ POST: Register a course
router.post("/registration", async (req, res) => {
  try {
    const newCourse = new CourseRegistration({
      fullName: req.body.fullName,
      email: req.body.email,
      phone: req.body.phone,
      gender: req.body.gender,
      city: req.body.city,
      college: req.body.college,
      degree: req.body.degree,
      department: req.body.department,
      year: req.body.year,
      rollNo: req.body.rollNo,

      courseName: req.body.courseName,
      duration: req.body.duration,
      mode: req.body.mode,
      preferredTime: req.body.preferredTime,
      level: req.body.level,

      additionalComments: req.body.additionalComments,
    });

    const savedCourse = await newCourse.save();
    res.status(200).json({ message: "Course registered successfully", data: savedCourse });
  } catch (error) {
    console.error("Error saving course:", error);
    res.status(500).json({ message: "Registration failed", error: error.message });
  }
});


// ✅ GET: Fetch all course registrations
router.get("/registrations", async (req, res) => {
  try {
    const courses = await CourseRegistration.find();
    res.status(200).json({ message: "Courses fetched successfully", data: courses });
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ message: "Failed to fetch courses", error: error.message });
  }
});


// ✅ PUT: Update a course registration
router.put("/update/:id", async (req, res) => {
  try {
    const updatedCourse = await CourseRegistration.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedCourse) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.status(200).json({ message: "Course updated successfully", data: updatedCourse });
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ message: "Failed to update course", error: error.message });
  }
});


// ✅ DELETE: Remove a course registration
router.delete("/delete/:id", async (req, res) => {
  try {
    const deletedCourse = await CourseRegistration.findByIdAndDelete(req.params.id);
    if (!deletedCourse) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.status(200).json({ message: "Course deleted successfully" });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({ message: "Failed to delete course", error: error.message });
  }
});

export default router;
