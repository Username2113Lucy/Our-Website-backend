import express from 'express';
import InternCert from '../models/InternCert.js';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();


async function generateCertificatePDF(doc, internCert) {
  const imagePath = path.join(
    __dirname,
    '../assets/images/Certificate.png'
  );

  // Register the custom font
  try {
    doc.registerFont(
      'CertificateName',
      path.join(__dirname, '../assets/fonts/GreatVibes-Regular.ttf')
    );
  } catch (error) {
    console.log('Custom font not found, using default font');
  }

  // Background
  if (fs.existsSync(imagePath)) {
    doc.image(imagePath, 0, 0, {
      width: doc.page.width,
      height: doc.page.height
    });
  } else {
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#ffffff');
  }

  // Date formatting
  const fromDate = new Date(internCert.fromDate).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  const toDate = new Date(internCert.toDate).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  const issueDate = new Date(internCert.issueDate).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  // CRITICAL: Disable auto page breaking completely
  doc.options.autoFirstPage = false;
  doc.bufferedPageRange(); // Initialize buffer
  
  // STUDENT NAME
  const nameWidth = doc.widthOfString(internCert.studentName, { 
    fontSize: 35, font: 'CertificateName' 
  });
  let nameX = (doc.page.width - nameWidth) / 2 - 50;
  doc.font('CertificateName').fontSize(35).fillColor('#000000')
    .text(internCert.studentName, nameX, 220, { lineBreak: false });

  // DOMAIN
  const domainText = internCert.domain.toUpperCase();
  const domainWidth = doc.widthOfString(domainText, { fontSize: 18, font: 'Times-Bold' });
  let domainX = (doc.page.width - domainWidth) / 2 + 100;
  doc.font('Times-Bold').fontSize(18).fillColor('#000000')
    .text(domainText, domainX, 305, { lineBreak: false, ellipsis: true });

  // RESET FONT
  doc.font('Helvetica');

  // Internship Period
  doc.fontSize(12).text(`${fromDate} - ${toDate}`, doc.page.width / 2, 328, { 
    align: 'center', lineBreak: false 
  });

  // Internship Mode
  doc.text(internCert.internshipMode, 270, 472, { align: 'center', lineBreak: false });

  // Duration
  if (internCert.duration) {
    doc.text(internCert.duration, 404, 472, { align: 'center', lineBreak: false });
  }

  // QR Code
  if (internCert.qrCodeData) {
    const qrImage = internCert.qrCodeData.replace(/^data:image\/png;base64,/, '');
    const qrBuffer = Buffer.from(qrImage, 'base64');
    doc.image(qrBuffer, doc.page.width - 155, 370, { width: 90, height: 90 });
  }

  // FOOTER - Using direct text placement without auto-page break
  // Override the _line method to prevent new page
  const originalLine = doc._line;
  doc._line = function(x, y) {
    if (y > doc.page.height - 20) {
      return; // Don't add new page
    }
    return originalLine.call(this, x, y);
  };

  doc.fontSize(8);
  
  // Place text directly on the page
  doc.text(`${internCert.internCertId}`, 625, 528, { 
    lineBreak: false,
    continued: false 
  });
  
  doc.text(`${issueDate}`, 625, 544, { 
    lineBreak: false,
    continued: false 
  });

  // Restore original _line method
  doc._line = originalLine;
  
  // CRITICAL: Prevent any new page at the end
  doc.addPage = function() { 
    return this; 
  };
}

router.get('/demo', async (req, res) => {
  try {
    // Generate a sample QR code for demo
    const sampleQR = await QRCode.toDataURL('https://www.vetriantechnologysolutions.in/verify-intern/DEMO/2024/0001');
    
    // Create sample/demo data for testing alignment
    const demoCert = {
      studentName: 'Vishwa R Y',
      collegeName: 'Demo College',           // ✅ ADD THIS
      department: 'Computer Science', 
      domain: 'Full Stack Development ',
      fromDate: new Date('2024-01-01'),
      toDate: new Date('2024-03-31'),
      internshipMode: 'Offline',
      duration: '15 Days',
      internCertId: 'DEMO/2024/0001',
      issueDate: new Date('2024-04-01'),
      qrCodeData: sampleQR  // ✅ Add QR code for demo
    };

    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="certificate_demo.pdf"');
    doc.pipe(res);

    await generateCertificatePDF(doc, demoCert);
    doc.end();
    
  } catch (error) {
    console.error(error);
    res.status(500).send('Error generating demo certificate');
  }
});



router.get('/verify/:certificateId', (req, res, next) => {
  console.log('✅ VERIFY ROUTE HIT! Certificate ID:', req.params.certificateId);
  next();
}, async (req, res) => {
  try {
    const { certificateId } = req.params;
    console.log('Searching for:', certificateId);
    
    const internCert = await InternCert.findOne({ 
      internCertId: certificateId 
    });
    
    console.log('Found:', internCert ? 'YES' : 'NO');
    
    if (!internCert) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found with this ID'
      });
    }
    
    res.json({
      success: true,
      data: {
        _id: internCert._id,
        internCertId: internCert.internCertId,
        studentName: internCert.studentName,
        collegeName: internCert.collegeName,     // ✅ ADD THIS
        department: internCert.department,       // ✅ ADD THIS
        domain: internCert.domain,
        fromDate: internCert.fromDate,
        toDate: internCert.toDate,
        internshipMode: internCert.internshipMode,
        duration: internCert.duration,
        issueDate: internCert.issueDate,
        createdAt: internCert.createdAt
      }
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying certificate'
    });
  }
});


// Get All
router.get('/', async (req, res) => {
  try {
    const internCerts = await InternCert.find()
      .sort({ createdAt: -1 });

    res.json(internCerts);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});

router.get('/preview', (req, res) => {
  const imagePath = path.join(
    __dirname,
    '../assets/images/Certificate.png'
  );

  res.sendFile(imagePath);
});


// Get One
router.get('/:id', async (req, res) => {
  try {
    const internCert = await InternCert.findById(
      req.params.id
    );

    if (!internCert) {
      return res.status(404).json({
        message: 'Intern certificate not found'
      });
    }

    res.json(internCert);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});

// Create
router.post('/', async (req, res) => {
  try {
    const internCert = new InternCert(req.body);
    
    // Ensure the ID uses hyphens (in case frontend sends slashes)
    if (internCert.internCertId && internCert.internCertId.includes('/')) {
      internCert.internCertId = internCert.internCertId.replace(/\//g, '-');
    }
    
    const savedInternCert = await internCert.save();

// In the POST route, change the verifyUrl to use the certificate ID directly:
const verifyUrl = `https://vetriantechnologysolutions.in/internship/${savedInternCert.internCertId}`;
    const qrCode = await QRCode.toDataURL(verifyUrl);
    savedInternCert.qrCodeData = qrCode;
    await savedInternCert.save();

    res.status(201).json(savedInternCert);
  } catch (error) {
    res.status(400).json({
      message: error.message
    });
  }
});

// Update
router.put('/:id', async (req, res) => {
  try {
    const internCert =
      await InternCert.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );

    res.json(internCert);
  } catch (error) {
    res.status(400).json({
      message: error.message
    });
  }
});

// Delete
router.delete('/:id', async (req, res) => {
  try {
    await InternCert.findByIdAndDelete(
      req.params.id
    );

    res.json({
      message:
        'Intern certificate deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});

/* ======================================================
   VIEW PDF
====================================================== */

router.get('/view/:id', async (req, res) => {
  try {
    const internCert =
      await InternCert.findById(req.params.id);

    if (!internCert) {
      return res
        .status(404)
        .send('Intern certificate not found');
    }

    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape'
    });

    res.setHeader(
      'Content-Type',
      'application/pdf'
    );

    doc.pipe(res);

    await generateCertificatePDF(
      doc,
      internCert
    );

    doc.end();
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send(
        'Error generating intern certificate'
      );
  }
});

router.get('/certificate-data/:id', async (req, res) => {
  try {
    const cert = await InternCert.findById(req.params.id);

    if (!cert) {
      return res.status(404).json({
        success: false
      });
    }

    res.json({
      success: true,
      data: cert
    });

  } catch (err) {
    res.status(500).json({
      success: false
    });
  }
});

/* ======================================================
   DOWNLOAD PDF
====================================================== */

router.get('/download/:id', async (req, res) => {
  try {
    const internCert =
      await InternCert.findById(req.params.id);

    if (!internCert) {
      return res
        .status(404)
        .send('Intern certificate not found');
    }

    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape'
    });

    res.setHeader(
      'Content-Type',
      'application/pdf'
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="intern_certificate_${internCert.internCertId}.pdf"`
    );

    doc.pipe(res);

    await generateCertificatePDF(
      doc,
      internCert
    );

    doc.end();
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send(
        'Error downloading intern certificate'
      );
  }
});






export default router;

