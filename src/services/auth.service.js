import mongoose from "mongoose";
import bcrypt from "bcrypt";
import slugify from "slugify";
import ApiError from "../utils/ApiError.util.js"
import { createTenant, findTenantBySlug } from "../repositories/tenant.repository.js";
import { createUser, findUserByEmail } from "../repositories/user.repository.js";

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