import express from "express";const router = express.Router();
import InternEntry from "../models/InternEntries.js";
// POST route to save entries
router.post("/entries", async (req, res) => {
  try {
    const { entries } = req.body;

    if (!entries || entries.length === 0) {
      return res.status(400).json({ message: "No entries provided" });
    }

    // Save all entries using insertMany
    const savedEntries = await InternEntry.insertMany(entries);

    res.status(201).json({
      message: "Entries saved successfully",
      data: savedEntries,
    });
  } catch (error) {
    console.error("Error saving entries:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

// GET route - Fetch all entries
router.get("/entries", async (req, res) => {
  try {
    const entries = await InternEntry.find(); // get all records
    res.status(200).json(entries);
  } catch (error) {
    console.error("Error fetching entries:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

// DELETE entry by ID
router.delete("/entries/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedEntry = await InternEntry.findByIdAndDelete(id);
    if (!deletedEntry) {
      return res.status(404).json({ message: "Entry not found" });
    }
    res.json({ message: "Entry deleted successfully" });
  } catch (error) {
    console.error("Error deleting entry:", error);
    res.status(500).json({ message: "Server error while deleting entry" });
  }
});

// ✅ Export router
export default router;
