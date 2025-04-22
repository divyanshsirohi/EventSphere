const express = require('express');
const router = express.Router();
const Payment = require('../models/payment');
const Registration = require('../models/registration');
const auth = require('../middleware/auth');
const Event = require('../models/event');


router.get('/form/:paymentId', auth.isMember, async (req, res) => {
  try {
    const paymentId = req.params.paymentId;
    const payment = await Payment.findById(paymentId);
    
    if (!payment) {
      req.flash('error', 'Payment not found');
      return res.redirect('/member/dashboard');
    }
    
    // Get registration details
    const registration = await Registration.findById(payment.reg_id);
    
    if (!registration) {
      req.flash('error', 'Registration not found');
      return res.redirect('/member/dashboard');
    }
    
    // Get event details
    const event = await Event.findById(registration.event_id);
    
    if (!event) {
      req.flash('error', 'Event not found');
      return res.redirect('/member/dashboard');
    }
    
    // Pass all necessary data to the template
    res.render('payment/form', {
      payment,
      registration,  // Add this line to pass registration data
      event,
      title: 'Complete Payment - EventSphere'
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to load payment form');
    res.redirect('/member/dashboard');
  }
});



// Show payment form
router.get('/process/:regId', auth.isAuthenticated, async (req, res) => {
  try {
    const regId = req.params.regId;
    const registration = await Registration.findById(regId);
    
    if (!registration) {
      req.flash('error', 'Registration not found');
      return res.redirect('/member/joined-events');
    }
    
    // Check if this registration belongs to the logged-in user
    if (registration.person_id !== req.session.user.id) {
      req.flash('error', 'Unauthorized');
      return res.redirect('/member/joined-events');
    }
    
    res.render('payment/form', {
      registration,
      title: 'Complete Payment - EventSphere'
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to load payment page');
    res.redirect('/member/joined-events');
  }
});

findById: async (eventId) => {
  try {
    const result = await db.query(
      `SELECT e.*, c.category_name, p.person_name as organizer_name
       FROM events e
       JOIN category c ON e.category_id = c.category_id
       JOIN person p ON e.organizer_id = p.person_id
       WHERE e.event_id = $1`,
      [eventId]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Error in Event.findById:', error);
    throw error;
  }
}

// Process payment
router.post('/process/:regId', auth.isAuthenticated, async (req, res) => {
  try {
    const regId = req.params.regId;
    const { cardNumber, cardName, expiryDate, cvv } = req.body;
    
    // Validate form data (simple validation)
    if (!cardNumber || !cardName || !expiryDate || !cvv) {
      req.flash('error', 'All fields are required');
      return res.redirect(`/payment/process/${regId}`);
    }
    
    // Get registration details
    const registration = await Registration.findById(regId);
    
    if (!registration) {
      req.flash('error', 'Registration not found');
      return res.redirect('/member/joined-events');
    }
    
    // Create payment record
    await Payment.create({
      reg_id: regId,
      amount: registration.price,
      status: 'completed'
    });
    
    // Update registration status
    await Registration.update(regId, 'confirmed');
    
    req.flash('success', 'Payment successful! Your registration is now confirmed.');
    res.redirect('/member/joined-events');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Payment processing failed');
    res.redirect(`/payment/process/${req.params.regId}`);
  }
});

module.exports = router;
