import Tenant from "../models/Tenant.model.js";

export const createTenant = async (data, session) => {
    const [tenant] = await Tenant.create([data], {session})
    return tenant
};

export const findTenantBySlug = async (slug) => {
    return Tenant.findOne({slug})
    
};