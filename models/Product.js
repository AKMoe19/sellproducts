const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    costPrice: { type: Number, default: 0 },
    price: { type: Number, required: true },
    stock: { type: Number, required: true },
    image: { type: String }
});

module.exports = mongoose.model('Product', ProductSchema);