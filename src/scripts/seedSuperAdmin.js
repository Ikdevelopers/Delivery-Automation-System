import User from "../models/User.model.js";
import { connectDb } from "../config/db.js";
import bcrypt from "bcrypt";
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const seedSuperAdmin = async () => {

  const name = process.env.SUPER_ADMIN_NAME;
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  await connectDb();

  // Step 1: Check if super_admin already exists
  const existing = await User.findOne({ role: "super_admin" });
  if (existing) {
    console.log("Super admin already exists. Exiting.");
    process.exit(0);
  }

  // Step 2: Hash the password
  const passwordHash = await bcrypt.hash(password, 10);

  // Step 3: Create the user

 const superAdmin = {
      name: name,
      email,
      passwordHash,
      role: "super_admin",
    }

    await User.create(superAdmin);
  

  console.log("Super admin created successfully.");
  process.exit(0);
};

seedSuperAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});