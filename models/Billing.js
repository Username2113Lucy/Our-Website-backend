import mongoose from "mongoose";

const billingSchema = new mongoose.Schema({
  billNo: {
    type: String,
    required: true,
    unique: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  studentName: {
    type: String,
    required: true
  },
  contact: {
    type: String,
    required: true
  },
  collegeName: {
    type: String,
    required: true
  },
  degree: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  items: [{
    title: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      default: 1
    },
    amount: {
      type: Number,
      required: true
    },
    totalCost: {
      type: Number,
      required: true
    }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  amountPaid: {
    type: Number,
    required: true
  },
  balanceDue: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
billingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Billing = mongoose.model("Billing", billingSchema);
export default Billing;