require("dotenv").config();
const mongoose = require("mongoose");
const Admin = require("./models/Admin");

const updateAdminAccess = async () => {
  try {
    console.log("Connecting to MongoDB...");
    // await mongoose.connect(process.env.MONGO_URI, {
    //   useNewUrlParser: true,
    //   useUnifiedTopology: true,
    // });
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB successfully!");

    // Find admin by email
    const admin = await Admin.findOne({ email: "admin@gmail.com" });

    if (!admin) {
      console.log("Admin not found! Creating new admin...");
      const bcrypt = require("bcryptjs");
      const newAdmin = await Admin.create({
        name: { en: "Admin" },
        image: "https://i.ibb.co/WpM5yZZ/9.png",
        email: "admin@gmail.com",
        password: bcrypt.hashSync("12345678"),
        phone: "360-943-7332",
        role: "Super Admin",
        joiningData: new Date(),
        access_list: [
          "dashboard",
          "products",
          "product",
          "categories",
          "attributes",
          "coupons",
          "custom-products",
          "orders",
          "order",
          "our-staff",
          "settings",
          "languages",
          "currencies",
          "store",
          "customization",
          "store-settings",
          "notifications",
          "edit-profile",
          "coming-soon",
          "customers",
          "customer-order",
        ],
      });
      console.log("✅ New admin created with custom-products access!");
    } else {
      console.log("Admin found:", admin.email);
      console.log("Current access list:", admin.access_list);

      // Add custom-products if not present
      if (!admin.access_list.includes("custom-products")) {
        admin.access_list.push("custom-products");
        await admin.save();
        console.log("✅ Added 'custom-products' to admin access list!");
      } else {
        console.log("ℹ️  'custom-products' already in access list!");
      }

      console.log("Updated access list:", admin.access_list);
    }

    console.log("\n🎉 Admin updated successfully!");
    console.log("👉 Now logout and login again in the admin panel!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

updateAdminAccess();
