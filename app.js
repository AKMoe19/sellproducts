require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Models
const Product = require('./models/Product');
const Sale = require('./models/Sale');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- Multer Configuration (Product Images) ---
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: function(req, file, cb) {
        cb(null, 'prod-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: function(req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) return cb(null, true);
        cb(new Error('Error: Images Only!'));
    }
});

// --- Middleware Setup ---
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'pos_secret_key_2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// --- Auth Middlewares ---
const isAuth = (req, res, next) => {
    if (req.session.user) return next();
    res.redirect('/login');
};

const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') return next();
    res.status(403).render('error');
};

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// --- Auth Routes ---
app.get('/login', (req, res) => res.render('login', { error: null }));

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.user = { id: user._id, username: user.username, role: user.role };
            return res.redirect('/');
        }
        res.render('login', { error: 'Username သို့မဟုတ် Password မှားနေပါသည်' });
    } catch (err) {
        res.render('login', { error: 'System Error' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// --- POS Main Route ---
app.get('/', isAuth, async (req, res) => {
    try {
        const products = await Product.find().sort({ name: 1 });
        res.render('index', { products });
    } catch (err) {
        res.status(500).send("Error loading products");
    }
});

// --- Admin Section ---
// app.get('/admin', isAuth, isAdmin, async (req, res) => {
//     const products = await Product.find().sort({ createdAt: -1 });
//     const users = await User.find(); 
//     res.render('admin', { products, users });
// });

// admin.ejs ကို ခေါ်တဲ့နေရာ (Admin Route)
app.get('/admin', isAuth, isAdmin, async (req, res) => {
    try {
        // Database ကနေ Product နဲ့ User အကုန်လုံးကို ခေါ်မယ်
        const products = await Product.find({}).sort({ createdAt: -1 });
        const users = await User.find({});

        // Total Inventory Value ကို တွက်မယ် (Cost Price * Stock)
        // ဝယ်ဈေးမရှိရင် ၀ လို့ သတ်မှတ်မယ်
        const totalValue = products.reduce((acc, p) => {
            const cost = p.costPrice || 0;
            const qty = p.stock || 0;
            return acc + (cost * qty);
        }, 0);

        // admin.ejs ဆီကို data တွေ ပို့ပေးမယ်
        res.render('admin', {
            products: products,
            users: users,
            totalValue: totalValue,
            title: "Admin Dashboard"
        });
    } catch (err) {
        console.error("Admin Page Error:", err);
        res.status(500).send("Server Error: Admin page loading failed.");
    }
});

// --- Add Product Route ---
app.post('/admin/add-product', isAuth, isAdmin, upload.single('image'), async (req, res) => {
    try {
        const { name, price, stock, costPrice } = req.body;
        // ရှေ့မှာ / ပါမှ public folder ထဲကနေ တိုက်ရိုက်ရှာမှာပါ
        const imageUrl = req.file ? '/uploads/' + req.file.filename : '/images/default-product.png';
        
        await new Product({ 
            name,
            costPrice: Number(costPrice),
            price: Number(price), 
            stock: Number(stock), 
            image: imageUrl 
        }).save();
        
        res.redirect('/admin');
    } catch (err) {
        res.status(500).send("Error adding product");
    }
});

// --- Edit Product Route ---
app.post('/admin/edit-product', isAuth, isAdmin, upload.single('image'), async (req, res) => {
    try {
        const { id, name, price, stock, costPrice } = req.body;
        const product = await Product.findById(id);

        let updateData = { 
            name, 
            costPrice: Number(costPrice),
            price: Number(price), 
            stock: Number(stock) 
        };

        if (req.file) {
            // ၁။ ပုံအသစ် တင်လိုက်ပြီဆိုရင် အရင်ရှိခဲ့တဲ့ ပုံအဟောင်းကို ဖျက်မယ်
            if (product.image && !product.image.includes('default-product.png')) {
                const oldImagePath = path.join(__dirname, 'public', product.image);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            // ၂။ ပုံအသစ်လမ်းကြောင်းကို သိမ်းမယ်
            updateData.image = '/uploads/' + req.file.filename;
        } else {
            updateData.image = product.image;
        }

        await Product.findByIdAndUpdate(id, updateData);
        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        res.status(500).send("Update failed");
    }
});

// --- Delete Product Route ---
app.get('/admin/delete-product/:id', isAuth, isAdmin, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product && product.image && !product.image.includes('default-product.png')) {
            // ပုံရှိတဲ့ လမ်းကြောင်းအပြည့်အစုံကို တည်ဆောက်သည်
            const imagePath = path.join(__dirname, 'public', product.image);
            
            // Server ပေါ်မှာ ဖိုင်တကယ်ရှိမရှိ စစ်ပြီး ဖျက်သည်
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }
        
        await Product.findByIdAndDelete(req.params.id);
        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        res.status(500).send("Delete failed");
    }
});

// --- Edit User Route ---
app.post('/admin/edit-user', isAuth, isAdmin, async (req, res) => {
    try {
        const { userId, newRole, newPassword } = req.body;
        let updateData = { role: newRole };
        if (newPassword && newPassword.trim() !== "") {
            updateData.password = await bcrypt.hash(newPassword, 10);
        }
        await User.findByIdAndUpdate(userId, updateData);
        res.redirect('/admin');
    } catch (err) {
        res.status(500).send("User Update Error");
    }
});

app.post('/checkout', isAuth, async (req, res) => {
    try {
        const { items, totalAmount, paymentMethod } = req.body;

        // ၁။ Voucher ID ကို Server မှာ generate လုပ်ခြင်း (မှန်ကန်ပါသည်)
        const voucherId = 'V-' + Math.floor(1000000 + Math.random() * 9000000);

        const newSale = new Sale({
            voucherId,
            items,
            totalAmount: Number(totalAmount), // ၂။ Number format သို့ ပြောင်းပါ
            paymentMethod: paymentMethod || 'Cash',
            // ၃။ သင့် system ၏ session logic အတိုင်း seller name ကို ယူပါ
            sellerName: req.session.user ? req.session.user.name : 'System',
            createdAt: new Date()
        });

        const savedSale = await newSale.save();
        
        // Real-time update အတွက် emit လုပ်ခြင်း
        if (typeof io !== 'undefined') {
            io.emit('reports-update', { newSale: savedSale });
        }

        // ၄။ Backend က သိမ်းလိုက်တဲ့ ID အစစ်ကို Frontend ဆီ ပြန်ပို့ခြင်း (မှန်ကန်ပါသည်)
        res.json({ success: true, sale: savedSale }); 

    } catch (err) {
        console.error("Checkout Error:", err);
        res.status(500).json({ success: false, error: "Checkout failed" });
    }
});

// Database မှ Voucher ရှာဖွေရန် API
app.get('/api/search-voucher', async (req, res) => {
    try {
        const { vId } = req.query;
        // Case-insensitive ရှာဖွေခြင်း (v-101 လို့ရိုက်လည်း V-101 ကိုတွေ့အောင်)
        const sale = await Sale.findOne({ 
            voucherId: { $regex: new RegExp('^' + vId + '$', 'i') } 
        });

        if (!sale) {
            return res.json({ success: false, message: 'Voucher ID မတွေ့ပါ' });
        }
        res.json({ success: true, sale });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error ဖြစ်ပွားနေပါသည်' });
    }
});

// --- Reports Section (with Top Sellers) ---
app.get('/reports', isAuth, async (req, res) => {
    try {
        // --- Role Permission Check ---
        if (req.session.user.role !== 'admin' && req.session.user.role !== 'cashier') {
            return res.status(403).send("ဒီစာမျက်နှာကို ကြည့်ရှုခွင့်မရှိပါ");
        }

        let queryDate = req.query.date ? new Date(req.query.date) : new Date();
        const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));

        const sales = await Sale.find({
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        }).sort({ createdAt: -1 });

        // --- Payment Method အလိုက် Stats ---
        const paymentStats = { Cash: 0, Kpay: 0, WavePay: 0, AYAPay: 0, CBPay: 0, MMQR: 0};
        const sellerStats = {};

        sales.forEach(sale => {
            const name = sale.sellerName || 'System';
            sellerStats[name] = (sellerStats[name] || 0) + sale.totalAmount;

            const method = sale.paymentMethod || 'Cash';
            if (paymentStats.hasOwnProperty(method)) {
                paymentStats[method] += sale.totalAmount;
            } else {
                paymentStats[method] = sale.totalAmount;
            }
        });

        const topSellers = Object.entries(sellerStats)
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total);

        res.render('reports', {
            sales,
            topSellers,
            paymentStats,
            user: req.session.user, // EJS ထဲမှာ role စစ်လို့ရအောင် user object ကိုပါ ပို့ပေးပါ
            dailySummary: {
                totalRevenue: sales.reduce((sum, s) => sum + s.totalAmount, 0),
                totalOrders: sales.length
            },
            selectedDate: req.query.date || new Date().toISOString().split('T')[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Reports Error");
    }
});

app.get('/api/analytics', async (req, res) => {
    try {
        const { type, year } = req.query;
        
        // မြန်မာစံတော်ချိန် (UTC+6:30) အတွက် လက်ရှိအချိန်ယူခြင်း
        const now = new Date();
        const mmTime = new Date(now.getTime() + (6.5 * 60 * 60 * 1000));
        
        const currentYear = parseInt(year) || mmTime.getUTCFullYear();
        const currentMonth = mmTime.getUTCMonth(); // လက်ရှိလ (0-11)

        let matchStage = {};
        let groupId = {};

        if (type === 'daily') {
            // ရွေးထားတဲ့ နှစ်၊ လက်ရှိလ ရဲ့ ၁ ရက်နေ့ ကနေ လကုန်အထိ
            const startOfMonth = new Date(Date.UTC(currentYear, currentMonth, 1));
            const endOfMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));

            matchStage = { createdAt: { $gte: startOfMonth, $lte: endOfMonth } };
            groupId = { $dayOfMonth: { date: "$createdAt", timezone: "+06:30" } };
        } 
        else if (type === 'monthly') {
            // ရွေးထားတဲ့ နှစ် (Selected Year) တစ်နှစ်စာအတွက်ပဲ Match လုပ်မယ်
            matchStage = {
                createdAt: {
                    $gte: new Date(Date.UTC(currentYear, 0, 1)),
                    $lte: new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999))
                }
            };
            groupId = { $month: { date: "$createdAt", timezone: "+06:30" } };
        } 
        else if (type === 'yearly') {
            matchStage = {}; 
            groupId = { $year: { date: "$createdAt", timezone: "+06:30" } };
        }

        const stats = await Sale.aggregate([
            { $match: matchStage },
            { 
                $group: { 
                    _id: groupId, 
                    totalRevenue: { $sum: "$totalAmount" }, 
                    orderCount: { $sum: 1 } 
                } 
            },
            { $sort: { "_id": 1 } } // နှစ်တွေကို အစဉ်လိုက်စီမယ်
        ]);
        
        res.json({ success: true, stats });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/analytics', (req, res) => {
    // login စစ်ဆေးတဲ့ logic ထည့်နိုင်သည်
    res.render('analytics', { user: req.session.user || {} });
});


// Socket.io connection logic ထဲမှာ ထည့်ပါ
io.on('connection', (socket) => {

    socket.on('process-sale', async (data) => {
        try {
            const { cart, discount, tax, sellerName, paymentMethod } = data;

            // ၁။ Voucher ID အသစ်ထုတ်ခြင်း (ဥပမာ- V-1710123456)
            const voucherId = 'V-' + Date.now().toString().slice(-8);

            // ၂။ စုစုပေါင်းကို တွက်ချက်ခြင်း (Server-side calculation က ပိုစိတ်ချရပါတယ်)
            let subtotal = 0;
            const saleItems = [];

            for (const item of cart) {
                // Product model ကနေ ဈေးနှုန်းမှန်ကို ပြန်စစ်တာ ပိုကောင်းပါတယ်
                subtotal += item.price * item.qty;
                saleItems.push({
                    productId: item.id,
                    name: item.name,
                    price: item.price,
                    qty: item.qty
                });

                // ၃။ Stock နှုတ်ခြင်း
                await Product.findByIdAndUpdate(item.id, { 
                    $inc: { stock: -item.qty } 
                });
            }

            const discAmt = subtotal * (discount / 100);
            const taxAmt = (subtotal - discAmt) * (tax / 100);
            const total = (subtotal - discAmt) + taxAmt;

            // ၄။ Sale Record ကို Database ထဲသိမ်းခြင်း
            const newSale = new Sale({
                voucherId,
                items: saleItems,
                subtotal,
                discountPercent: discount,
                taxPercent: tax,
                totalAmount: total,
                paymentMethod,
                sellerName,
                createdAt: new Date()
            });

            await newSale.save();

            // ၅။ Stock Update ဖြစ်သွားကြောင်း အားလုံးကို အသိပေးခြင်း
            const products = await Product.find({});
            const stockUpdates = products.map(p => ({ id: p._id, newStock: p.stock }));
            io.emit('stock-updated', stockUpdates);

            console.log(`Sale Completed: ${voucherId}`);

        } catch (err) {
            console.error('Sale Error:', err);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`POS running on http://localhost:${PORT}`));