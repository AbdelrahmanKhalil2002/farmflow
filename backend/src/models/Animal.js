const mongoose = require('mongoose');
const { Schema, Types: { ObjectId } } = mongoose;

const weightEntrySchema = new Schema({
  date:     { type: Date, required: true, default: Date.now },
  weightKg: { type: Number, required: true, min: 0 },
  notes:    { type: String, trim: true, maxlength: 200 },
}, { _id: true });

const vaccinationEntrySchema = new Schema({
  vaccine:     { type: String, required: true, trim: true, maxlength: 100 },
  date:        { type: Date, required: true, default: Date.now },
  nextDueDate: { type: Date },
  vet:         { type: String, trim: true, maxlength: 100 },
  notes:       { type: String, trim: true, maxlength: 300 },
}, { _id: true });

const animalSchema = new Schema({
  seller: { type: ObjectId, ref: 'User', required: true, index: true },
  farm:   { type: ObjectId, ref: 'Farm', index: true },

  tagId:  { type: String, trim: true, maxlength: 50 },   // farm ear-tag / ID
  type:   { type: String, required: true, enum: ['cattle','buffalo','sheep','goat','camel','horse','poultry','rabbit','ostrich','gazelle','oryx','deer','llama','alpaca','donkey','mule','other'] },
  breed:  { type: String, trim: true, maxlength: 80 },
  gender: { type: String, enum: ['male','female','unknown'], default: 'unknown' },

  dob:   { type: Date },   // date of birth — age derived from this
  color: { type: String, trim: true, maxlength: 50 },

  // Current weight — mirrors last weightLog entry for quick reads
  currentWeight: { type: Number, min: 0 },

  healthStatus: {
    type: String,
    enum: ['healthy', 'sick', 'quarantine', 'deceased'],
    default: 'healthy',
  },

  status: {
    type: String,
    enum: ['active', 'sold', 'deceased'],
    default: 'active',
  },

  notes: { type: String, trim: true, maxlength: 1000 },

  // ── Pregnancy tracking (females only) ────────────────────────────────────────
  pregnancyStatus: {
    type: String,
    enum: ['none', 'pregnant', 'recently_gave_birth'],
    default: 'none',
  },
  pregnancyDate:     { type: Date },             // date mating / insemination occurred
  expectedBirthDate: { type: Date },             // expected delivery date
  birthCount:        { type: Number, default: 0, min: 0 },  // how many times gave birth

  // ── Weight goal tracking ─────────────────────────────────────────────────────
  targetWeight:    { type: Number, min: 0 },        // target slaughter/market weight (kg)
  nextWeighingDate: { type: Date },                  // next scheduled weighing

  weightLog:       { type: [weightEntrySchema],      default: [] },
  vaccinationLog:  { type: [vaccinationEntrySchema], default: [] },

  images: { type: [String], default: [] },
}, { timestamps: true });

// Compound index: one tagId per seller (sparse so null tagIds don't conflict)
animalSchema.index({ seller: 1, tagId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Animal', animalSchema);
