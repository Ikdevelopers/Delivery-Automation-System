import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.util.js";
import { findSessionByToken } from "../repositories/session.repository.js";
import { findUserById } from "../repositories/user.repository.js";

const verifyJWT = async (req, res, next) => {
    const token = req.cookies?.token;

    if (!token) {
        throw new ApiError(401, "Unauthorized");
    }
    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

        // FIX 1: pass token not decodedToken — Session is stored by raw token string
        const session = await findSessionByToken(token);
        if (!session) {
            throw new ApiError(401, "Session expired or logged out");
        }

        // FIX 2: missing await, and use decodedToken.userId not bare userId
        const user = await findUserById(decodedToken.userId);
        if (!user) {
            throw new ApiError(401, "User not found");
        }

        // FIX 3: attach user to req.user, not a response — middleware never res.json()
        req.user = user;

        next(); // FIX 4: next() stays here, nothing after it

    } catch (error) {
        if (error.name === "TokenExpiredError") {
            throw new ApiError(401, "Token expired, please login again");
        }
        throw new ApiError(401, "Invalid token");

    }
};

export default verifyJWT;