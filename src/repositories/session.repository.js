import Session from "../models/Session.model.js";

export const createSession = async (data, session) => {
    const [doc] = await Session.create([data], {session});
    return doc;
};

export const findSessionByToken = async (token) => {
    return Session.findOne({token})
};

export const deleteSessionByToken = async (token) => {
    return Session.deleteOne({token})
};

export const deleteAllSessionsByUserId = async (userId) => {
    return Session.findOne({userId})
};