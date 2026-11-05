import { registerTenantAdmin, loginUser, logoutUser, logoutAllDevices } from "../services/auth.service.js";
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

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // metadata we store on the Session document — lowercase "headers", not "Headers"
  const userAgent = req.headers["user-agent"] || "";
  const ipAddress = req.ip;

  // actually CALL the service function — this does the real work (find user,
  // compare password, generate JWT, save Session)
  const { user, token } = await loginUser({ email, password, userAgent, ipAddress });

  const cookieOptions = {
    httpOnly: true,       // JS on the frontend can't read this cookie — blocks XSS token theft
    secure: process.env.NODE_ENV === "production", // HTTPS-only in production
    sameSite: "strict",   // not sent on cross-site requests — CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, survives browser close
  };

  // 200, not 201 — login succeeds but doesn't CREATE a new resource
  return res
    .status(200)
    .cookie("token", token, cookieOptions)
    .json(new ApiResponse(200, { user }, "Login successful"));
});

// 1. logout — this device
export const logout = asyncHandler(async (req, res) => {
    // FILL: get token from req.cookies.token
    const token = req.cookies?.token;
    // FILL: call logoutUser(token) from service
    await logoutUser(token);
    // FILL: clear the cookie using res.clearCookie("token")
    res.clearCookie("token");
    // FILL: return 200 response "Logged out successfully"
    return res
    .status(200)
    .json(new ApiResponse(200, null, "Logged out successfully"));
});

// 2. logoutAll — all devices
export const logoutAll = asyncHandler(async (req, res) => {
    // FILL: get userId from req.user (middleware ne attach kiya tha)
    const userId = req.user._id;
    // FILL: call logoutAllDevices(userId) from service
    await logoutAllDevices(userId);
    // FILL: clear the cookie
    res.clearCookie("token");
    // FILL: return 200 response "Logged out from all devices"
    return res
    .status(200)
    .json(new ApiResponse(200, null, "Logged out from all devices"))
});