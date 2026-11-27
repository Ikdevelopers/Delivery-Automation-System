import Vendor from "../models/Vendor.model.js";

export const getVendorsByTenant = async (tenantId) => {
    return await Vendor.find({ tenantId });
};

export const createVendor = async (data, session) => {
    const [vendor] = await Vendor.create([data], { session } )
    return vendor;
};

export const findVendorById = async (vendorId) => {
    // Pass the id value directly; wrapping it in an object would search for _id: { vendorId }
    return await Vendor.findById(vendorId);
};

export const updateVendor = async (vendorId, data) => {
    return await Vendor.findByIdAndUpdate(vendorId, data, { new: true });
};

export const deleteVendor = async (vendorId) => {
    return await Vendor.findByIdAndDelete(vendorId);
};

export const checkbaseCode = async (baseCode) => {
    if (typeof baseCode !== "string" || !baseCode.trim()) {
        return [];
    }

    const escapedBaseCode = baseCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    return await Vendor.find({
        shortCode: { $regex: `^${escapedBaseCode}`, $options: "i" }
    }).select("shortCode").lean();
};