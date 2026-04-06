require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User'); // User Model လမ်းကြောင်းမှန်ပါစေ

async function createCashier() {
    try {
        console.log("Connecting to MongoDB...");
        // .env ထဲက URI ကိုသုံးမယ်၊ မရှိရင် connection string တိုက်ရိုက်ထည့်ပါ
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected successfully.");

        // ရှိပြီးသား cashier user ဟောင်းရှိရင် ဖျက်ထုတ်မယ်
        await User.deleteMany({ username: 'sale1' });

        // Cashier အကောင့်အသစ် တည်ဆောက်ခြင်း
        const cashier = new User({
            username: 'sale1',
            password: '1234', // Model ထဲက pre-save hook က hash လုပ်ပေးပါလိမ့်မယ်
            role: 'cashier'
        });

        await cashier.save();
        console.log("-----------------------------------------");
        console.log("Cashier Account Created Successfully!");
        console.log("Username: sale1");
        console.log("Password: 1234");
        console.log("Role: cashier");
        console.log("-----------------------------------------");

    } catch (error) {
        console.error("Error creating cashier:", error);
    } finally {
        mongoose.connection.close();
        process.exit();
    }
}

createCashier();