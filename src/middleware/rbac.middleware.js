
import ApiError from "../utils/ApiError.util.js"

const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        // your logic here
        const userRole = req.user?.role;

        if (allowedRoles.includes(userRole)) {
            return next();
        }

        throw new ApiError(403, "Access denied")
    }
}

export default authorizeRoles;