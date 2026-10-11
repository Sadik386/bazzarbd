import mongoose from "mongoose";

const supportTicketSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  subject: { type: String, default: "No Subject" },
  message: { type: String, required: true },
  status: { type: String, enum: ["open", "replied", "closed"], default: "open" },
  replies: [{
    message: { type: String, required: true },
    repliedBy: { type: String, default: "Admin" },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

export default mongoose.model("SupportTicket", supportTicketSchema);
