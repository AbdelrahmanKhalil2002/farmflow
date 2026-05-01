const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
  animal:       { type: mongoose.Schema.Types.ObjectId, ref: 'Animal', required: true, index: true },
  seller:       { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true, index: true },
  date:         { type: Date, required: true, default: Date.now },
  diagnosis:    { type: String, trim: true },
  treatment:    { type: String, trim: true },
  medication:   { type: String, trim: true },
  vet:          { type: String, trim: true },
  cost:         { type: Number, min: 0 },
  followUpDate: { type: Date },
  resolved:     { type: Boolean, default: false },
  notes:        { type: String, trim: true },
}, { timestamps: true });

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
