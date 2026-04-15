import express from "express";
import Billing from "../models/Billing.js";
import PDFDocument from "pdfkit";
import mongoose from "mongoose";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// 📄 Generate unique bill number
const generateBillNo = () => {
  const prefix = "BILL";
  const year = new Date().getFullYear().toString().slice(-2);
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const timestamp = Date.now().toString().slice(-6);
  return `${prefix}/${year}${month}/${timestamp}`;
};

// ========== HELPER FUNCTIONS ==========

// Helper function for DOWNLOAD (attachment)
const generatePDFResponse = (res, bill) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  
  // For download - use attachment
  res.setHeader('Content-Type', 'application/pdf');
  const filename = bill.billNo ? `Bill_${bill.billNo.replace(/\//g, '-')}.pdf` : 'Bill.pdf';
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  
  doc.pipe(res);
  generatePDFContent(doc, bill);
  doc.end();
};

// Helper function for PREVIEW (inline - opens in browser)
const generatePDFPreview = (res, bill) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  
  // For preview - use inline with additional headers
  res.setHeader('Content-Type', 'application/pdf');
  const filename = bill.billNo ? `Preview_${bill.billNo.replace(/\//g, '-')}.pdf` : 'Preview.pdf';
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  
  // Additional headers to force browser to display PDF
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  doc.pipe(res);
  generatePDFContentWithWatermark(doc, bill);
  doc.end();
};

// Common PDF content generator
// Common PDF content generator
const generatePDFContent = (doc, bill) => {
  try {
    // Try to add background image
    const templatePath = path.join(__dirname, '../assets/images/bill_Template.jpg');
    
    if (fs.existsSync(templatePath)) {
      // Add background image (full page)
      doc.image(templatePath, 0, 0, { 
        width: 595.28, // A4 width in points
        height: 841.89 // A4 height in points
      });
      
      // Set text color to contrast with background
      doc.fillColor('#000000'); // Black text for readability
    } else {
      console.log('Background template not found at:', templatePath);
      // Fallback to original styling
      doc.rect(40, 40, 520, 100).stroke();
    }
  } catch (error) {
    console.error('Error loading background image:', error);
    // Fallback to original styling
    doc.rect(40, 40, 520, 100).stroke();
  }
  
  // Adjust text positions for background
  const textYOffset = 20; // Adjust if needed for background

  // Company Address

  // Bill Title
  doc.moveDown(4);
  doc.fontSize(20).font('Helvetica-Bold').text('PROJECT INVOICE', { align: 'center' });
  
  // Bill Details
  doc.moveDown();
  doc.fontSize(12);
// Left side: Bill Info
doc.text(`Bill No: ${bill.billNo || 'N/A'}`, 50, 160);
doc.text(`Date: ${bill.date ? new Date(bill.date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}`, 50, 180);

// Right side: Status with color coding
const totalCost = bill.totalAmount || 0;
const amountPaid = bill.amountPaid || 0;
const balance = bill.balanceDue || (totalCost - amountPaid);

let status = "Unpaid";
let statusColor = 'red';

if (balance === 0) {
  status = "Paid";
  statusColor = 'green';
} else if (amountPaid > 0 && amountPaid < totalCost) {
  status = "Partially Paid";
  statusColor = 'orange';
}

// Draw status with color
doc.fillColor(statusColor);
doc.text(`Status: ${status}`, 350, 160);
doc.fillColor('black'); // Reset color



// Line separator
doc.moveTo(50, 220).lineTo(550, 220).stroke();

  // BILL TO Section
  doc.moveDown();
  doc.font('Helvetica-Bold').text('BILL TO:', 50, 230);
  doc.font('Helvetica');
  doc.text(bill.studentName || 'N/A', 50, 250);
  doc.text(bill.collegeName || 'N/A', 50, 265);
  doc.text(`Degree: ${bill.degree || 'N/A'}, Department: ${bill.department || 'N/A'}`, 50, 280);
  doc.text(`Contact: ${bill.contact || 'N/A'}`, 50, 295);
  
// Line separator above table
// doc.moveTo(50, 320).lineTo(550, 320).stroke();

// Draw top border of table
doc.moveTo(50, 330).lineTo(550, 330).stroke();

// Table Header (inside the table)
doc.font('Helvetica-Bold').fontSize(12);
doc.text('Description', 55, 340, { width: 240 });
doc.text('Total Cost (₹)', 320, 340, { width: 100, align: 'center' });
doc.text('Paid (₹)', 430, 340, { width: 80, align: 'center' });
doc.text('Balance (₹)', 520, 340, { width: 80, align: 'center' });

// Horizontal separating line between header and data
doc.moveTo(50, 355).lineTo(550, 355).stroke();

// Table Data (Single Project Row) - Start below the separating line
let yPosition = 365; // Move down for data
doc.font('Helvetica').fontSize(11);

// Get project details
const projectTitle = bill.items && bill.items.length > 0 
  ? bill.items[0].title || 'Project' 
  : 'Project';


// Description Column
doc.text(projectTitle, 55, yPosition, { width: 240 });

// Total Cost Column
doc.text(`₹${totalCost.toFixed(2)}`, 320, yPosition, { width: 100, align: 'center' });

// Paid Column
doc.text(`₹${amountPaid.toFixed(2)}`, 430, yPosition, { width: 80, align: 'center' });

// Balance Column (with color)
if (balance > 0) {
  doc.fillColor('red');
} else if (balance < 0) {
  doc.fillColor('green');
} else {
  doc.fillColor('#000000'); // Black for zero balance
}

doc.text(`₹${balance.toFixed(2)}`, 520, yPosition, { width: 80, align: 'center' });
doc.fillColor('black'); // Reset color

// Draw bottom border of table
doc.moveTo(50, 380).lineTo(550, 380).stroke();

// Draw vertical borders for the entire table
doc.moveTo(50, 330).lineTo(50, 380).stroke(); // Left border
doc.moveTo(550, 330).lineTo(550, 380).stroke(); // Right border

// Draw column separators (from top to bottom, crossing the horizontal separator)
doc.moveTo(300, 330).lineTo(300, 380).stroke(); // After Description
doc.moveTo(420, 330).lineTo(420, 380).stroke(); // After Total Cost  
doc.moveTo(510, 330).lineTo(510, 380).stroke(); // After Paid

// Move down after table
yPosition = 400;

// Terms and Conditions
doc.font('Helvetica-Bold').text('Terms & Conditions:', 50, yPosition);
yPosition += 20;
doc.font('Helvetica').fontSize(9);

const statement = bill.statement || "Registration fee is non-refundable. Payment must be made within 30 days.";
const terms = statement.split('\n');
terms.forEach(term => {
  doc.text(`• ${term.trim()}`, 60, yPosition, { width: 480 });
  yPosition += 15;
});
  
  // Footer with signatures
  yPosition += 40;
  // doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
  
  yPosition += 20;
  doc.font('Helvetica-Bold').fontSize(10);
  doc.text('For Tech Academy', 100, yPosition);
  doc.text('Customer Signature', 400, yPosition);
  
  yPosition += 30;
  doc.font('Helvetica').fontSize(9);
  doc.text('Authorized Signatory', 100, yPosition);
  doc.text('____________________', 400, yPosition);
  
  // Footer note
  yPosition += 40;
  doc.font('Helvetica-Oblique').fontSize(8).text('Thank you for your business! This is a computer-generated invoice.', 
    { align: 'center', width: 500 });
};

// PDF content with watermark for preview
const generatePDFContentWithWatermark = (doc, bill) => {

  
  // Call the regular content generator
  generatePDFContent(doc, bill);
  
};

// ========== ROUTES ==========

// 📄 Preview Bill with Dummy Data (opens in browser tab)
router.get("/preview", async (req, res) => {
  try {
    // Create dummy bill data for preview
    const dummyBill = {
      billNo: "BILL/2412/123456",
      date: new Date().toISOString().split('T')[0],
      studentName: "John Doe",
      contact: "+91 9876543210",
      collegeName: "Anna University",
      degree: "B.Tech",
      department: "Computer Science",
      items: [
        {
          title: "Full Stack Web Development Course",
          quantity: 1,
          amount: 15000,
          totalCost: 15000
        }
      ],
      totalAmount: 19000,
      amountPaid: 19000,
      balanceDue: 0,
      statement: `1. Registration fee is non-refundable\n2. Payment must be made within 30 days of bill generation\n3. Late payment may incur additional charges\n4. 50% advance payment required for course commencement\n5. Balance to be paid before final assessment`,
      signature: "Authorized Signatory",
      seal: "Official Seal"
    };

    // Generate PDF preview (opens in browser)
    generatePDFPreview(res, dummyBill);

  } catch (error) {
    console.error("Error generating preview:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate preview",
      error: error.message
    });
  }
});

// 📄 Preview with Minimal Data (for testing edge cases)
// router.get("/preview/minimal", async (req, res) => {
//   try {
//     const minimalBill = {
//       billNo: "BILL/2412/000001",
//       date: new Date().toISOString().split('T')[0],
//       studentName: "Minimal Test",
//       contact: "1234567890",
//       items: [
//         {
//           title: "Test Course",
//           quantity: 1,
//           amount: 1000,
//           totalCost: 1000
//         }
//       ],
//       totalAmount: 1000,
//       amountPaid: 500,
//       balanceDue: 500
//     };

//     generatePDFPreview(res, minimalBill);

//   } catch (error) {
//     console.error("Error generating minimal preview:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to generate minimal preview",
//       error: error.message
//     });
//   }
// });

// 📄 Preview with Many Items (for testing table overflow)
// router.get("/preview/many-items", async (req, res) => {
//   try {
//     const items = [];
//     for (let i = 1; i <= 15; i++) {
//       items.push({
//         title: `Course Module ${i}: Advanced Topic ${i}`,
//         quantity: 1,
//         amount: 1000 + (i * 100),
//         totalCost: 1000 + (i * 100)
//       });
//     }

//     const manyItemsBill = {
//       billNo: "BILL/2412/888888",
//       date: new Date().toISOString().split('T')[0],
//       studentName: "Test Student with Many Items",
//       contact: "+91 8888888888",
//       collegeName: "University of Testing",
//       degree: "M.Tech",
//       department: "Software Engineering",
//       items: items,
//       totalAmount: items.reduce((sum, item) => sum + item.totalCost, 0),
//       amountPaid: 10000,
//       balanceDue: items.reduce((sum, item) => sum + item.totalCost, 0) - 10000,
//       statement: "This is a test bill with many items to check PDF formatting and page overflow handling.\nAll amounts are for testing purposes only.",
//       signature: "Test Signatory",
//       seal: "Test Seal"
//     };

//     generatePDFPreview(res, manyItemsBill);

//   } catch (error) {
//     console.error("Error generating many items preview:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to generate many items preview",
//       error: error.message
//     });
//   }
// });

// ========== MAIN BILLING ROUTES ==========

// ✅ Create new bill
router.post("/create", async (req, res) => {
  try {
    const billData = req.body;
    
    if (!billData.billNo) {
      billData.billNo = generateBillNo();
    }

    const newBilling = new Billing(billData);
    await newBilling.save();

    res.status(201).json({
      success: true,
      message: "Bill created successfully",
      data: newBilling,
      billId: newBilling._id
    });

  } catch (error) {
    console.error("Error creating bill:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create bill",
      error: error.message
    });
  }
});

// ✅ Create new bill AND generate PDF in one go
router.post("/create-and-download", async (req, res) => {
  try {
    const billData = req.body;
    
    if (!billData.billNo) {
      billData.billNo = generateBillNo();
    }

    const newBilling = new Billing(billData);
    await newBilling.save();

    generatePDFResponse(res, newBilling);

  } catch (error) {
    console.error("Error creating bill:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create bill",
      error: error.message
    });
  }
});

// 📋 Get all bills
router.get("/all", async (req, res) => {
  try {
    const bills = await Billing.find().sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: bills.length,
      data: bills
    });

  } catch (error) {
    console.error("Error fetching bills:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bills",
      error: error.message
    });
  }
});

// 🔍 Get single bill by ID
router.get("/:id", async (req, res) => {
  try {
    const bill = await Billing.findById(req.params.id);
    
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found"
      });
    }

    res.status(200).json({
      success: true,
      data: bill
    });

  } catch (error) {
    console.error("Error fetching bill:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bill",
      error: error.message
    });
  }
});

// 📄 Generate PDF from bill data (POST - without requiring database ID)
router.post("/generate-pdf", async (req, res) => {
  try {
    const billData = req.body;
    
    if (billData._id && mongoose.Types.ObjectId.isValid(billData._id)) {
      const bill = await Billing.findById(billData._id);
      if (bill) {
        generatePDFResponse(res, bill);
        return;
      }
    }
    
    if (!billData.billNo) {
      billData.billNo = generateBillNo();
    }
    
    generatePDFResponse(res, billData);

  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate PDF",
      error: error.message
    });
  }
});

// 📄 Generate PDF from database by ID (GET - downloads)
router.get("/generate-pdf/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bill ID format"
      });
    }

    const bill = await Billing.findById(req.params.id);
    
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found"
      });
    }

    generatePDFResponse(res, bill);

  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate PDF",
      error: error.message
    });
  }
});

// ✏️ Update bill
router.put("/update/:id", async (req, res) => {
  try {
    const updatedBill = await Billing.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedBill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Bill updated successfully",
      data: updatedBill
    });

  } catch (error) {
    console.error("Error updating bill:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update bill",
      error: error.message
    });
  }
});

// 🗑️ Delete bill
router.delete("/delete/:id", async (req, res) => {
  try {
    const deletedBill = await Billing.findByIdAndDelete(req.params.id);

    if (!deletedBill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Bill deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting bill:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete bill",
      error: error.message
    });
  }
});

// 📊 Get billing statistics
router.get("/stats/summary", async (req, res) => {
  try {
    const totalBills = await Billing.countDocuments();
    const totalRevenue = await Billing.aggregate([
      { $group: { _id: null, total: { $sum: "$amountPaid" } } }
    ]);
    
    const pendingBills = await Billing.countDocuments({ balanceDue: { $gt: 0 } });
    const completedBills = await Billing.countDocuments({ balanceDue: 0 });

    res.status(200).json({
      success: true,
      data: {
        totalBills,
        totalRevenue: totalRevenue[0]?.total || 0,
        pendingBills,
        completedBills
      }
    });

  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
      error: error.message
    });
  }
});

// 📈 Search bills
router.get("/search/:query", async (req, res) => {
  try {
    const { query } = req.params;
    
    const bills = await Billing.find({
      $or: [
        { billNo: { $regex: query, $options: 'i' } },
        { studentName: { $regex: query, $options: 'i' } },
        { contact: { $regex: query, $options: 'i' } },
        { collegeName: { $regex: query, $options: 'i' } }
      ]
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bills.length,
      data: bills
    });

  } catch (error) {
    console.error("Error searching bills:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search bills",
      error: error.message
    });
  }
});

export default router;