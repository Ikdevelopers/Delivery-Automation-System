import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import slugify from "slugify";
import ApiError from "../utils/ApiError.util.js";
import { createTenant, findTenantBySlug } from "../repositories/tenant.repository.js";
import { createUser, findUserByEmail } from "../repositories/user.repository.js";
import { createSession } from "../repositories/session.repository.js";

const generateUniqueSlug = async (name) => {
    const baseSlug = slugify(name, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;

    while (await findTenantBySlug(slug)) {
        slug = `${baseSlug}-${counter}`
        counter++;
    }
    return slug;
};

export const registerTenantAdmin = async ({
    tenantName,
    whatsappNumber,
    adminName,
    email,
    password,
}) => {
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
        throw new ApiError(409, "Email already registered");
    }

    //Most useful 3 lines
    const slug = await generateUniqueSlug(tenantName);
    const passwordHash = await bcrypt.hash(password, 10);
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const tenant = await createTenant(
            { name: tenantName, slug, whatsappNumber },
            session
        );

        const user = await createUser(
            {
                tenantId: tenant._id,
                name: adminName,
                email,
                passwordHash,
                role: "tenant_admin",
            },
            session
        );
        //binding work
        await session.commitTransaction();

        //making it safer to be safe from leaks
        user.passwordHash = undefined;

        //giving response
        return {tenant, user};

    }
    catch(error){
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        throw error;
    }finally{
        await session.endSession()
    }

};

export const loginUser = async ({ email, password, userAgent, ipAddress }) => {
    // Step 1: find the user by email — await is required since this is a DB call
    const user = await findUserByEmail(email);
    if (!user) {
        // Same generic message as the password-mismatch case below —
        // don't reveal whether the email exists or not
        throw new ApiError(401, "Invalid credentials");
    }

    // Step 2: compare the submitted plain password against the stored hash
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
        throw new ApiError(401, "Invalid credentials");
    }

    // Step 3: build the JWT payload — only non-sensitive identifiers go here,
    // since JWT payloads are readable by anyone (base64, not encrypted)
    const payload = { userId: user._id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });

    // Step 4: session expiry = 7 days from now (matches the JWT's own expiry)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Step 5: save this login as a Session document — no transaction needed,
    // since this is a single collection write
    await createSession({
        userId: user._id,
        token,
        userAgent,
        ipAddress,
        expiresAt,
    });

    // Step 6: strip the hash before sending the user object back in the response
    user.passwordHash = undefined;

    return { user, token };
};