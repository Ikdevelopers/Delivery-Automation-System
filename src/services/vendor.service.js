// services/vendor.service.js
import { generateShortCode } from "../utils/generateShortCode.js";
import { createVendor } from "../repositories/vendor.repository.js";

export const registerVendor = async (vendorData) => {
  if (!vendorData) {
    throw new Error("Vendor data is required");
  }

  if (typeof vendorData.name !== "string" || !vendorData.name.trim()) {
    throw new Error("Vendor name is required");
  }

  // Step 1: generate shortCode from vendor name
  const shortCode = await generateShortCode(vendorData.name);

  // Step 2: add shortCode to vendorData
  const preparedData = { ...vendorData, shortCode };

  // Step 3: call repository to save vendor
  return await createVendor(preparedData);
};