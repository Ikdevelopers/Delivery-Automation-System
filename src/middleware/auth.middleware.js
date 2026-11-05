import { ApiError } from "../utils/ApiError.util.js";
import jwt from "jsonwebtoken";

const verifyJWT = async (req, res, next) => {
    const token = req.cookies?.token;

    if (!token) {
        throw new ApiError(401, "Unauthorized")
    }
    try {
        
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET)
        req.user = decodedToken;
        next();

    } catch (error) {
        if (error.name === "TokenExpiredError") {
            throw new ApiError(401, "Token expired, please login again");
        }
        throw new ApiError(401, "Invalid token");
        
    }
};

export default verifyJWT;