const mongoose = require('mongoose');

const todoSchema = new mongoose.Schema({
    task: { type: String, required: true, unique: true },
    addedOn: { type: Date, required: true, default: Date.now() },
    completed: { type: Boolean, required: true, default: false }
});

module.exports = mongoose.model('Todo', todoSchema);
