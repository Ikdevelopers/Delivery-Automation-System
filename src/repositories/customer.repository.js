import Customer from "../models/Customer.model.js";

// Find a customer by tenant and WhatsApp phone, creating the record if needed.
// Upsert is used so the worker can safely reuse the same customer record.
export const findOrCreateCustomerByPhone = async (tenantId, phone) => {
    return await Customer.findOneAndUpdate(
        { tenantId, phone },
        { $setOnInsert: { tenantId, phone } },
        { returnDocument: "after", upsert: true, setDefaultsOnInsert: true, runValidators: true },
    );
};