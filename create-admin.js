require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User'); // User Model ရှိရပါမယ်

async function createAdmin() {
    try {
        // ၁။ Database ချိတ်ဆက်ခြင်း
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected successfully.");

        // ၂။ ရှိပြီးသား User အဟောင်းများကို ဖျက်ခြင်း (Optional - အသစ်ပဲဖြစ်စေချင်ရင်)
        await User.deleteMany({ username: 'admin' });
        console.log("Checking for existing admin...");

        // ၃။ Password ကို Hash လုပ်ခြင်း
        const hashedPassword = await bcrypt.hash('admin123', 10);

        // ၄။ Admin အကောင့်အချက်အလက်များ
        const admin = new User({
            username: 'admin',
            password: 'admin123', // Model ထဲမှာ pre-save hash ပါရင် ဒီအတိုင်းထား၊ မပါရင် hashedPassword သုံးပါ
            role: 'admin'
        });

        // const cashierAccount = new User({ 
        //     username: 'cashier', 
        //     password: 'cashier123', 
        //     role: 'cashier' 
        // });

        // ၅။ Save လုပ်ခြင်း
        await admin.save();
        console.log("-----------------------------------------");
        console.log("Admin Account Created Successfully!");
        console.log("Username: admin");
        console.log("Password: admin123");
        console.log("-----------------------------------------");

    } catch (error) {
        console.error("Error creating admin:", error);
    } finally {
        // ၆။ အလုပ်ပြီးရင် Connection ပိတ်ခြင်း
        mongoose.connection.close();
        process.exit();
    }
}

createAdmin();