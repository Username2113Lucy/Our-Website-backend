import mongoose from "mongoose";

const InternEntriesSchema = new mongoose.Schema({
  email: String,
  domain: String,
  course: String,
  days: String,
  referralCode: String,
  loginID: String,
  password: String,
  status: {
    type: String,
    enum: ["not opened", "opened", "closed", "expired","pending"], // only allow these values
    default: "not opened", // always starts as not opened
  }
},{timestamps:true});

// ✅ Make sure the variable name matches exactly
const InternEntry = mongoose.model("InternEntry", InternEntriesSchema);

export default InternEntry;