import express from "express";
const router = express.Router();
import IdeaForge from '../models/Ideaforge.js';


// Add this helper function at the top of your routes file
function parseDDMMYYYY(dateString) {
  const [day, month, year] = dateString.split('/');
  return new Date(`${year}-${month}-${day}`);
}

// Register new idea forge participant
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      degree,
      department,
      year,
      domain,
      ideaType,
      ideaDescription,
      finalDate,
      gotReferral,
      referralCode
    } = req.body;

    // Check for duplicate entries
    const isDuplicate = await IdeaForge.checkDuplicate(email, phone);
    if (isDuplicate) {
      return res.status(409).json({
        success: false,
        duplicate: true,
        message: 'Duplicate entry found. You have already registered with this email or phone number.'
      });
    }

    // Create new participant - handle empty ideaDescription properly
    const participant = new IdeaForge({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      degree: degree.trim(),
      department: department.trim(),
      year,
      domain,
      ideaType,
      ideaDescription: ideaDescription && ideaDescription.trim() !== '' ? ideaDescription.trim() : undefined, // Use undefined instead of empty string
      finalDate: parseDDMMYYYY(finalDate),
      gotReferral,
      referralCode: referralCode ? referralCode.toUpperCase().trim() : ''
    });

    await participant.save();

    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      referralCode: participant.generatedReferralCode,
      participantId: participant._id
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle validation errors with more details
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      console.log('Validation errors:', messages); // Add this for debugging
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      let message = 'Duplicate entry found. ';
      
      if (field === 'email') message += 'This email is already registered.';
      else if (field === 'phone') message += 'This phone number is already registered.';
      else if (field === 'generatedReferralCode') message += 'Referral code conflict. Please try again.';
      
      return res.status(409).json({
        success: false,
        duplicate: true,
        message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
});

// Get all participants (admin only)
router.get('/participants', async (req, res) => {
  try {
    const participants = await IdeaForge.find()
      .select('-__v')
      .sort({ registrationDate: -1 });
    
    res.json({
      success: true,
      count: participants.length,
      participants
    });
  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get participant by ID
router.get('/participant/:id', async (req, res) => {
  try {
    const participant = await IdeaForge.findById(req.params.id)
      .select('-__v');
    
    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found'
      });
    }

    res.json({
      success: true,
      participant
    });
  } catch (error) {
    console.error('Get participant error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Verify referral code
router.get('/verify-referral/:code', async (req, res) => {
  try {
    const referralCode = req.params.code.toUpperCase();
    const referralRegex = /^VR-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

    if (!referralRegex.test(referralCode)) {
      return res.json({
        valid: false,
        message: 'Invalid referral code format'
      });
    }

    const participant = await IdeaForge.findOne({ 
      generatedReferralCode: referralCode 
    });

    if (!participant) {
      return res.json({
        valid: false,
        message: 'Referral code not found'
      });
    }

    res.json({
      valid: true,
      message: 'Valid referral code',
      referrer: participant.name
    });
  } catch (error) {
    console.error('Verify referral error:', error);
    res.status(500).json({
      valid: false,
      message: 'Server error'
    });
  }
});

// Delete participant by ID
router.delete('/participants/:id', async (req, res) => {
  try {
    const deletedParticipant = await IdeaForge.findByIdAndDelete(req.params.id);

    if (!deletedParticipant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found'
      });
    }

    res.json({
      success: true,
      message: 'Participant deleted successfully',
      participant: {
        id: deletedParticipant._id,
        name: deletedParticipant.name,
        email: deletedParticipant.email
      }
    });

  } catch (error) {
    console.error('Delete participant error:', error);

    // Handle cast errors (invalid ID)
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid participant ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
});

// Update participant by ID
router.put('/participants/:id', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      degree,
      department,
      year,
      domain,
      ideaType,
      ideaDescription,
      finalDate,
      gotReferral,
      referralCode,
      status
    } = req.body;

    // Find and update participant
    const updatedParticipant = await IdeaForge.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          ...(name && { name: name.trim() }),
          ...(email && { email: email.toLowerCase().trim() }),
          ...(phone && { phone: phone.trim() }),
          ...(degree && { degree: degree.trim() }),
          ...(department && { department: department.trim() }),
          ...(year && { year }),
          ...(domain && { domain }),
          ...(ideaType && { ideaType }),
          ...(ideaDescription !== undefined && { ideaDescription: ideaDescription.trim() }),
          ...(finalDate && { finalDate: new Date(finalDate) }),
          ...(gotReferral && { gotReferral }),
          ...(referralCode !== undefined && { referralCode: referralCode ? referralCode.toUpperCase().trim() : '' }),
          ...(status && { status })
        }
      },
      { 
        new: true, 
        runValidators: true
      }
    ).select('-__v');

    if (!updatedParticipant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found'
      });
    }

    res.json({
      success: true,
      message: 'Participant updated successfully',
      participant: updatedParticipant
    });

  } catch (error) {
    console.error('Update participant error:', error);

    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      let message = 'Duplicate entry found. ';
      
      if (field === 'email') message += 'This email is already registered.';
      else if (field === 'phone') message += 'This phone number is already registered.';
      
      return res.status(409).json({
        success: false,
        message
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    // Handle cast errors (invalid ID)
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid participant ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
});

export default router;