// backend/controllers/auth.controller.js

import { registerTenantAdmin } from "../services/auth.service.js";
import { ApiResponse } from "../utils/ApiResponse.util.js";
import { asyncHandler } from "../utils/asyncHandler.util.js";

export const register = asyncHandler(async (req, res) => {
  const { tenantName, whatsappNumber, adminName, email, password } = req.body;

  const result = await registerTenantAdmin({
    tenantName,
    whatsappNumber,
    adminName,
    email,
    password,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, result, "Tenant registered successfully"));
});