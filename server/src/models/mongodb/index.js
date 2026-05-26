// server/src/models/mongodb/index.js
// Central export for all MongoDB models

const User = require('./user.model');
const Customer = require('./customer.model');
const Appointment = require('./appointment.model');
const Bill = require('./bill.model');

module.exports = {
  User,
  Customer,
  Appointment,
  Bill
};

// Made with Bob
