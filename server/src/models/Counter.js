import mongoose from 'mongoose'

// Tracks per-company monthly sequence for atomic invoice number generation.
// _id format: "<companyId>:<YYYYMM>"
const counterSchema = new mongoose.Schema({
  _id: String,
  seq: { type: Number, default: 0 },
})

export default mongoose.model('Counter', counterSchema)
