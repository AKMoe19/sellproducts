const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, required: true },
    image: { type: String } // <--- ဒီ line ပါရပါမယ်
});

module.exports = mongoose.model('Product', ProductSchema);