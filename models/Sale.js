const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
    voucherId: { type: String, unique: true },
    items: Array,
    subtotal: Number,
    discountPercent: Number,
    taxPercent: Number,
    totalAmount: Number,
    paymentMethod: String,
    sellerName: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Sale', saleSchema);