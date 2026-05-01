/**
 * Singleton app-wide config document.
 * Currently stores:
 *   eidMode: boolean  — admin toggles Eid mode manually
 *   eidDate: Date     — expected Eid Al-Adha date (used for countdown)
 */
const mongoose = require('mongoose');

const appConfigSchema = new mongoose.Schema(
  {
    _singleton: { type: String, default: 'main', unique: true },
    eidMode:    { type: Boolean, default: false },
    eidDate:    { type: Date,    default: null },
  },
  { timestamps: true }
);

// Ensure singleton exists on first access
appConfigSchema.statics.get = async function () {
  let cfg = await this.findOne({ _singleton: 'main' });
  if (!cfg) cfg = await this.create({ _singleton: 'main' });
  return cfg;
};

module.exports = mongoose.model('AppConfig', appConfigSchema);
