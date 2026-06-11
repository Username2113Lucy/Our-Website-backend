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
const generatePDFContent = (doc, bill) => {
  try {
    // Try to add background image
    const templatePath = path.join(__dirname, '../assets/images/Bill_Template.jpg');

    if (fs.existsSync(templatePath)) {
      doc.image(templatePath, 0, 0, {
        width: 595.28,
        height: 841.89
      });
      doc.fillColor('#000000');
    } else {
      console.log('Background template not found at:', templatePath);
      doc.rect(40, 40, 520, 100).stroke();
    }
  } catch (error) {
    console.error('Error loading background image:', error);
    doc.rect(40, 40, 520, 100).stroke();
  }

  // Helper function to get registration type from title
  const getRegistrationType = (title) => {
    if (title?.toLowerCase().includes('course')) return 'Course Registration';
    if (title?.toLowerCase().includes('internship')) return 'Internship Registration';
    if (title?.toLowerCase().includes('project')) return 'Project Registration';
    return title || 'Registration';
  };

  // Helper function to get domain/project title
  const getDomainOrProjectTitle = (item, idx) => {
    if (item.domainOrProject) return item.domainOrProject;
    return '';
  };

  // Bill Title
  doc.moveDown(4);
  doc.fontSize(20).font('Helvetica-Bold').text('PAYMENT INVOICE', { align: 'center' });

  // Bill Details
  doc.moveDown();
  doc.fontSize(12);
  doc.text(`Bill No: ${bill.billNo || 'N/A'}`, 50, 160);
  doc.text(`Date: ${bill.date ? new Date(bill.date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}`, 50, 180);

  // Status with color coding
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

  doc.fillColor(statusColor);
  doc.text(`Status: ${status}`, 350, 160);
  doc.fillColor('black');

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

  // Table Header - Draw vertical borders for header
  let yPosition = 330;
  
  // Draw top border of table
  doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
  
  // Draw vertical borders for header cells
  doc.moveTo(50, yPosition).lineTo(50, yPosition + 25).stroke(); // ✅ ADD THIS - Left border for S.No

  doc.moveTo(80, yPosition).lineTo(80, yPosition + 25).stroke(); // After S.No
  doc.moveTo(180, yPosition).lineTo(180, yPosition + 25).stroke(); // After Registration Type
  doc.moveTo(310, yPosition).lineTo(310, yPosition + 25).stroke(); // After Domain/Project
  doc.moveTo(390, yPosition).lineTo(390, yPosition + 25).stroke(); // After Amount
  doc.moveTo(480, yPosition).lineTo(480, yPosition + 25).stroke(); // After Total
  doc.moveTo(550, yPosition).lineTo(550, yPosition + 25).stroke(); // Right border
  
  // Table Headers - Centered vertically
  const headerCenterY = yPosition + 12.5;
  doc.font('Helvetica-Bold').fontSize(10);
  doc.text('S.No', 50, headerCenterY - 4, { width: 30, align: 'center' });
  doc.text('Registration Type', 85, headerCenterY - 4, { width: 95, align: 'center' });
  doc.text('Domain / Project Title', 185, headerCenterY - 4, { width: 125, align: 'center' });
  doc.text('Amount', 315, headerCenterY - 4, { width: 75, align: 'center' });
  doc.text('Paid', 405, headerCenterY - 4, { width: 65, align: 'center' });
  doc.text('Balance', 475, headerCenterY - 4, { width: 85, align: 'center' });

  // Horizontal separating line between header and data
  yPosition += 25;
  doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();

  // Table Data with dynamic row heights and centered content
  let currentY = yPosition ;
  let serialNo = 1;
  
  // Calculate row heights first
  let rowHeights = [];
  
  bill.items.forEach((item, idx) => {
    const domainOrProject = getDomainOrProjectTitle(item, idx);
    const titleText = domainOrProject || '-';
    const registrationType = getRegistrationType(item.title);
    
    let maxLines = 1;
    
    // Calculate lines for Domain/Project Title
    doc.fontSize(9);
    const titleLines = Math.ceil(doc.heightOfString(titleText, { width: 130 }) / 12);
    maxLines = Math.max(maxLines, titleLines);
    
    // Calculate lines for Registration Type
    const regLines = Math.ceil(doc.heightOfString(registrationType, { width: 100 }) / 12);
    maxLines = Math.max(maxLines, regLines);
    
    const rowHeight = Math.max(22, 15 + (maxLines - 1) * 12);
    rowHeights.push(rowHeight);
  });
  
// Render rows with dynamic heights
bill.items.forEach((item, idx) => {
  const registrationType = getRegistrationType(item.title);
  const domainOrProject = getDomainOrProjectTitle(item, idx);
  const amount = item.amount || 0;
  const totalCostItem = item.totalCost || 0;
  const paidItem = totalCostItem > 0 ? (totalCostItem * (amountPaid / totalCost)) || 0 : 0;
  const balanceItem = totalCostItem - paidItem;
  const rowHeight = rowHeights[idx];

  // Check if we need a new page
  if (currentY + rowHeight > 750) {
    doc.addPage();
    // Re-add header on new page
    const newPageY = 50;
    doc.moveTo(50, newPageY).lineTo(550, newPageY).stroke();
    doc.moveTo(50, newPageY).lineTo(50, newPageY + 25).stroke(); // Left border
    doc.moveTo(80, newPageY).lineTo(80, newPageY + 25).stroke(); // After S.No
    doc.moveTo(180, newPageY).lineTo(180, newPageY + 25).stroke(); // After Registration Type
    doc.moveTo(310, newPageY).lineTo(310, newPageY + 25).stroke(); // After Domain/Project
    doc.moveTo(390, newPageY).lineTo(390, newPageY + 25).stroke(); // After Amount
    doc.moveTo(480, newPageY).lineTo(480, newPageY + 25).stroke(); // After Paid
    doc.moveTo(550, newPageY).lineTo(550, newPageY + 25).stroke(); // Right border
    
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('S.No', 55, newPageY + 8.5, { width: 30, align: 'center' });
    doc.text('Registration Type', 85, newPageY + 8.5, { width: 95, align: 'center' });
    doc.text('Domain / Project Title', 185, newPageY + 8.5, { width: 125, align: 'center' });
    doc.text('Amount (₹)', 315, newPageY + 8.5, { width: 75, align: 'center' });
    doc.text('Paid (₹)', 395, newPageY + 8.5, { width: 85, align: 'center' });
    doc.text('Balance (₹)', 485, newPageY + 8.5, { width: 65, align: 'center' });
    
    doc.moveTo(50, newPageY + 25).lineTo(550, newPageY + 25).stroke();
    currentY = newPageY + 35;
  }

  const rowStartY = currentY;
  
  doc.font('Helvetica').fontSize(9);
  
  // Calculate center Y for each cell based on row height
  const cellCenterY = rowStartY + (rowHeight / 2) - 3;
  
  // S.No
  doc.text(serialNo.toString(), 55, cellCenterY, { width: 30, align: 'center' });
  
  // Registration Type
  doc.text(registrationType, 85, rowStartY + 7, { width: 95, align: 'left', lineBreak: true });
  
  // Domain/Project Title
  const titleText = domainOrProject || '-';
  doc.text(titleText, 185, rowStartY + 7, { width: 120, align: 'left', lineBreak: true });
  
  // Amount
  doc.text(`${amount.toFixed(2)}`, 315, cellCenterY, { width: 75, align: 'center' });
  
  // Paid
  doc.text(`${paidItem.toFixed(2)}`, 395, cellCenterY, { width: 85, align: 'center' });
  
  // Balance - with color coding
  if (balanceItem > 0) {
    doc.fillColor('red');
  } else if (balanceItem < 0) {
    doc.fillColor('green');
  } else {
    doc.fillColor('black');
  }
  doc.text(`${balanceItem.toFixed(2)}`, 485, cellCenterY, { width: 65, align: 'center' });
  doc.fillColor('black');

  // Draw vertical borders for this row
  doc.moveTo(80, rowStartY).lineTo(80, rowStartY + rowHeight).stroke(); // After S.No
  doc.moveTo(180, rowStartY).lineTo(180, rowStartY + rowHeight).stroke(); // After Registration Type
  doc.moveTo(310, rowStartY).lineTo(310, rowStartY + rowHeight).stroke(); // After Domain/Project
  doc.moveTo(390, rowStartY).lineTo(390, rowStartY + rowHeight).stroke(); // After Amount
  doc.moveTo(480, rowStartY).lineTo(480, rowStartY + rowHeight).stroke(); // After Paid
  doc.moveTo(550, rowStartY).lineTo(550, rowStartY + rowHeight).stroke(); // Right border
  
  // Draw left border
  doc.moveTo(50, rowStartY).lineTo(50, rowStartY + rowHeight).stroke();

  // Draw horizontal separator line after each row
  const rowEndY = rowStartY + rowHeight;
  doc.moveTo(50, rowEndY).lineTo(550, rowEndY).stroke();
  
  currentY = rowEndY;
  serialNo++;
});

  // Terms and Conditions
  let termsY = currentY + 30;

  if (termsY > 800) {
    doc.addPage();
    termsY = 50;
  }

  doc.font('Helvetica-Bold').fontSize(10);
  doc.text('Terms & Conditions:', 50, termsY);
  termsY += 15;

  doc.font('Helvetica').fontSize(8);

  // Detect registration types
  let hasCourse = false;
  let hasInternship = false;
  let hasProject = false;

  bill.items.forEach(item => {
    const title = item.title?.toLowerCase() || '';
    if (title.includes('course')) hasCourse = true;
    if (title.includes('internship')) hasInternship = true;
    if (title.includes('project')) hasProject = true;
  });

  let terms = [];

  if (hasProject && !hasCourse && !hasInternship) {
    terms = [
      "Project Registration fee is non-refundable once the project is assigned.",
      "Project deliverables and milestones must be completed within the agreed timeline.",
      "Final project report and source code will be provided only after full payment.",
    ];
  } else if ((hasCourse || hasInternship) && !hasProject) {
    terms = [
      "Course/Internship registration fee is non-refundable.",
      "Course/internship materials and access will be provided only after full payment.",
      "Certificate of completion will be issued only after clearing all dues.",
    ];
  } else if (hasProject && (hasCourse || hasInternship)) {
    terms = [
      "Registration fee for all services is non-refundable.",
      "Course/internship materials and project access will be provided only after full payment.",
      "Final certificates and project deliverables will be released only after clearing all dues.",
    ];
  } else {
    terms = [
      "Registration fee is non-refundable under any circumstances.",
      "Full payment must be completed before final deliverables/certificates are issued.",
      "All services must be utilized within the specified validity period.",
    ];
  }

  terms.forEach(term => {
    if (termsY > 820) {
      doc.addPage();
      termsY = 50;
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('Terms & Conditions (continued):', 50, termsY);
      termsY += 15;
      doc.font('Helvetica').fontSize(8);
    }
    doc.text(`• ${term}`, 60, termsY, { width: 480 });
    termsY += 12;
  });

  // Footer with signatures
  let footerY = termsY + 30;
  
  if (footerY > 820) {
    doc.addPage();
    footerY = 50;
  }
  
  doc.font('Helvetica-Bold').fontSize(10);
  doc.text('For Vetrian Technology Solutions', 50, footerY);
  doc.text('Customer Signature', 400, footerY);
  
  footerY += 20;
  doc.font('Helvetica').fontSize(9);
  doc.text('Authorized Signatory', 80, footerY);
  doc.text('____________________', 400, footerY);
  
  footerY += 50;
  doc.font('Helvetica-Oblique').fontSize(8);
  doc.text('Thank you for your business! This is a computer-generated invoice.', 190, footerY);
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
    // Create dummy bill data for preview with multiple items
    const dummyBill = {
      billNo: "BILL/2406/123456",
      date: new Date().toISOString().split('T')[0],
      studentName: "John Doe",
      contact: "+91 9876543210",
      collegeName: "Anna University",
      degree: "B.Tech",
      department: "Computer Science",
      items: [
        {
          title: "Course Registration",
          registrationType: "course",
          domainOrProject: "Full Stack Development",
          quantity: 1,
          amount: 5000,
          totalCost: 5000
        },
        {
          title: "Internship Registration",
          registrationType: "internship",
          domainOrProject: "Artificial Intelligence",
          quantity: 1,
          amount: 3000,
          totalCost: 3000
        },
        {
          title: "Project Registration",
          registrationType: "project",
          domainOrProject: "E-Learning Platform Developmentrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr",
          quantity: 1,
          amount: 8000,
          totalCost: 8000
        }
      ],
      totalAmount: 16000,
      amountPaid: 10000,
      balanceDue: 6000,
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

// 📄 Generate PDF from bill data (POST - preview in browser)
router.post("/generate-pdf", async (req, res) => {
  try {
    const billData = req.body;

    if (billData._id && mongoose.Types.ObjectId.isValid(billData._id)) {
      const bill = await Billing.findById(billData._id);
      if (bill) {
        generatePDFPreview(res, bill); // Change to preview
        return;
      }
    }

    if (!billData.billNo) {
      billData.billNo = generateBillNo();
    }

    generatePDFPreview(res, billData); // Change to preview

  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate PDF",
      error: error.message
    });
  }
});

// 📄 Generate PDF from database by ID (GET - preview in browser)
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

    // ✅ CHANGE THIS LINE - Use generatePDFPreview instead of generatePDFResponse
    generatePDFPreview(res, bill);

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