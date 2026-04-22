import express from "express";
import DemoRequest from "../models/Demo_Request.js";

const router = express.Router();

router.post("/demo-request", async (req, res) => {
  try {
    const { name, contact, email, service, message } = req.body;

    if (!name || !contact || !service) {
      return res.status(400).json({
        success: false,
        message: "Name, Contact and Service are required",
      });
    }

    const newRequest = await DemoRequest.create({
      name,
      contact,
      email,
      service,
      message,
    });

    res.status(201).json({
      success: true,
      message: "Demo request submitted successfully",
      data: newRequest,
    });

  } catch (error) {
    console.error("Error saving demo request:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// PUT - Update status
router.put("/demo-request/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!["viewed", "not_viewed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const updatedRequest = await DemoRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Status updated successfully",
      data: updatedRequest,
    });

  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

export default router;
