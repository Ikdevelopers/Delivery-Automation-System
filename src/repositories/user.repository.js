import User from "../models/User.model.js"

export const createUser = async (data, session) => {
    const [user] = await User.create([data], {session})
    return user;
};

export const findUserByEmail = async (email) => {
    return User.findOne({email})
};