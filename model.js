const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  password: String,
  userType: {
    type: String,
    default: 'patient', 
},
});

const Patient = mongoose.model('Patient', patientSchema,'patient');

module.exports = { Patient };
