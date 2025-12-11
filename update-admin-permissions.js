// Run this script in your API folder to grant Cookie Analytics access to all admins
// Command: node update-admin-permissions.js

require("dotenv").config();
const mongoose = require("mongoose");

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✓ Connected to MongoDB"))
  .catch((err) => {
    console.error("✗ MongoDB connection error:", err);
    process.exit(1);
  });

// Define Admin schema (simplified)
const adminSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String,
  access: [String], // Array of accessible routes
});

const Admin = mongoose.model("Admin", adminSchema);

async function updateAdminPermissions() {
  try {
    console.log("\nUpdating admin permissions...\n");

    // Get all admins
    const admins = await Admin.find({});
    console.log(`Found ${admins.length} admin(s)`);

    for (const admin of admins) {
      // Check if cookie-analytics is already in their access list
      if (!admin.access || !admin.access.includes("cookie-analytics")) {
        // Use updateOne to avoid validation issues with existing fields
        await Admin.updateOne(
          { _id: admin._id },
          { $addToSet: { access: "cookie-analytics" } }
        );
        console.log(`✓ Added cookie-analytics permission to: ${admin.email}`);
      } else {
        console.log(`○ ${admin.email} already has cookie-analytics permission`);
      }
    }

    console.log("\n✓ All admins updated successfully!\n");
    console.log("Now restart your admin panel and login again.");
  } catch (error) {
    console.error("✗ Error updating permissions:", error);
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed.");
    process.exit(0);
  }
}

// Run the update
updateAdminPermissions();
