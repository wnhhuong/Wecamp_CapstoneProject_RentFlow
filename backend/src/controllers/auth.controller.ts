import { NextFunction, Request, Response } from "express";
import bcrypt from "bcrypt"
import { generateAccessToken, generateOnboardingToken } from "../utils/token.js";
import { sendError, sendSuccess } from "../utils/response.js";
import Account from "../models/Account.js";
import Contract from "../models/Contract.js";
import User from "../models/User.js";
import { AccountRole, AccountStatus, ContractStatus, ParameterName, RoomStatus } from "../models/enums.js";
import hashFunction from "../utils/hashPassword.js";
import { OnboardingRequest } from "../middlewares/auth.middleware.js";
import Room from "../models/Room.js";
import Parameter from "../models/Parameter.js";
import fs from "fs";
import mongoose from "mongoose";

// Authenticate a user and get token
// POST /api/auth/login
// not done, cần chú ý lại logic id theo schema
export const loginUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {username, password} = req.body;
        // missing a field
        if(!username || !password){
            res.status(400).json({ message: "Please provide username and password" });
            return;
        }

        // check for username
        const account = await Account.findOne({username}).select("+password");;
        if(!account){
            res.status(401).json({message: "Invalid email or password"});
            return;
        }

        // check password
        const isMatch = await bcrypt.compare(password, account.password || "");
        if(!isMatch){
            res.status(401).json({message: "Invalid email or password"});
            return;
        }

        // check status
        if(account.status === AccountStatus.BANNED){
            res.status(403).json({message: "This account is not available"});
            return;
        }
        
        if(account.status === AccountStatus.INACTIVE){
            //require first login
            const onboardingToken = generateOnboardingToken(account._id.toString());
            const data = {
                requireFirstLogin: true, onboardingToken,
                accessToken: null,
                account: {
                    accountID: account._id,
                    roomID: account.roomID,
                    username: account.username,
                    role: account.role,
                    status: account.status,
                },
                user: null
            }
            sendSuccess(res, data);
            return;
        }
        //active account - normal login
        //admin
        if(account.role === AccountRole.ADMIN){
            const accessToken = generateAccessToken({
                role: "admin",
                accountID: account._id.toString(),
            })
            const data = {
                requireFirstLogin: false, 
                onboardingToken: null,
                accessToken,
                account: {
                    accountID: account._id,
                    roomID: account.roomID,
                    username: account.username,
                    role: account.role,
                    status: account.status,
                },
                user: null
            }
            sendSuccess(res, data)
            return
        }
        //normal user: account -> room -> contract <- user
        const contract = await Contract.findOne({roomID: account.roomID, status: ContractStatus.ACTIVE})
        if(!contract){
            sendError(res, 404, "No active contract found for this room");
            return;
        }
        const user = await User.findById(contract.userID)
        if (!user) {
            sendError(res, 404, "User not found for this contract");
            return;
        }

        const accessToken = generateAccessToken({
            role: "user",
            accountID: account._id.toString(),
            roomID: account.roomID!.toString(),
            contractID: contract._id.toString(),
            userID: user._id.toString(),
            startDate: contract.startDate.toISOString(),
        });
        sendSuccess(res, {
            requireFirstLogin: false,
            accessToken,
            onboardingToken: null,
            account: {
                    accountID: account._id,
                    roomID: account.roomID,
                    username: account.username,
                    role: account.role,
                    status: account.status,
                },
            user,
        });
        return;
    } catch (error) {
        next(error);
    }
}

// First login: create profile
// POST /api/auth/first-login/profile
export const firstLoginProfile = async (req: OnboardingRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { accountID } = req.onboarding!;
        const account = await Account.findById(accountID);
        if(!account){ sendError(res, 404, "Account not found"); return; }
        if(account.status !== AccountStatus.INACTIVE){
            sendError(res, 409, "This account has already completed onboarding");
            return;
        }
        
        const {fullName, dob, phoneNumber, identityNo, sex, nationality, por, password} = req.body;
        if(!fullName || !dob || !phoneNumber || !identityNo || 
            !sex || !nationality || !por || !password){
                res.status(400).json({ success: false, data: null, message: "Please enter all required fields" });
                return;
            }
        
        // find by CCCD
        let user = await User.findOne({ identityNo });
        if (user) {
            Object.assign(user, { fullName, DoB: dob, phoneNumber, sex, nationality, PoR: por });
            await user.save();
        } else {
            user = await User.create({ fullName, DoB: dob, phoneNumber, identityNo, sex, nationality, PoR: por });
        }

        account.password = await hashFunction(password);
        //account.status = AccountStatus.ACTIVE
        await account.save();

        const onboardingToken = generateOnboardingToken(account._id.toString(), user._id.toString());
        sendSuccess(res, { onboardingToken, user });
    } catch (error) {
        next(error);
    }
}

// First login: preview contract
// GET /api/auth/first-login/contract-preview
export const contractPreview = async (req: OnboardingRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {accountID, userID} = req.onboarding!;
        
        // not done profile
        if (!userID) {
            sendError(res, 400, "Please complete your profile first");
            return;
        }

        // get account
        const account = await Account.findById(accountID)
        if(!account){ sendError(res, 404, "Account not found"); return; }

        // check exist active contract of this room. if exist -> can not create new contract
        const existing = await Contract.findOne({ roomID: account.roomID, status: ContractStatus.ACTIVE });
        if (existing) {
            sendError(res, 409, "This room already has an active contract");
            return;
        }

        // get room and user in4
        const room = await Room.findById(account.roomID);
        if (!room) { sendError(res, 404, "Room not found"); return; }
        const user = await User.findById(userID);
        if (!user) { sendError(res, 404, "User not found"); return; }

        // get param in4
        const durationParam = await Parameter.findOne({ name: ParameterName.YEAR_TO_EXTEND });
        const durationYears = Number(durationParam?.value);
        if (!durationYears || durationYears <= 0) {
            sendError(res, 500, "Contract duration is not configured");
            return;
        }
        const templateParam = await Parameter.findOne({ name: ParameterName.CONTRACT_PLACEHOLDER });
        if (!templateParam) { sendError(res, 500, "Contract template is not configured"); return; }
        const startDate = new Date();
        const expireDate = new Date(startDate);
        expireDate.setFullYear(expireDate.getFullYear() + durationYears);
        
        sendSuccess(res, {
            renderedText: templateParam.value, // chưa merge, giữ nguyên {placeholder}
            user,
            room,
            draftContract: {
                startDate,
                expireDate,
                propertyDeposit: room.deposit,
            },
        });
    } catch (error) {
        next(error)
    }
}

// First login: sign contract
// POST /api/auth/first-login/contract
export const createContract = async (req: OnboardingRequest, res: Response, next: NextFunction): Promise<void> => {
    const file = req.file
    const cleanupFile = () => {
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    }

    try {
        const { accountID, userID } = req.onboarding!;
        const { acceptedTerms } = req.body; // multipart -> đến dưới dạng string "true"/"false"
        // not done profile
        if (!userID) {
            cleanupFile();
            sendError(res, 400, "Please complete your profile first");
            return;
        }

        if (acceptedTerms !== "true") {
            cleanupFile();
            sendError(res, 400, "acceptedTerms must be true");
            return;
        }
        if (!file) {
            sendError(res, 400, "Signature file is required");
            return;
        }
        // create session to make sure everything have to success together
        const session = await mongoose.startSession();
        let contract, account, room, user;
        
        try {
            session.startTransaction();
            account = await Account.findById(accountID).session(session);
            if (!account) throw Object.assign(new Error("Account not found"), { status: 404 });
 
            room = await Room.findById(account.roomID).session(session);
            if (!room) throw Object.assign(new Error("Room not found"), { status: 404 });

            user = await User.findById(userID).session(session);
            if (!user) throw Object.assign(new Error("User not found"), { status: 404 });

 
            // check trùng contract active ngay trong transaction — không tách middleware,
            const existing = await Contract.findOne({ roomID: room._id, status: ContractStatus.ACTIVE }).session(session);
            if (existing) throw Object.assign(new Error("This room already has an active contract"), { status: 409 });
 
            const durationParam = await Parameter.findOne({ name: ParameterName.YEAR_TO_EXTEND }).session(session);
            const durationYears = Number(durationParam?.value);
            if (!durationYears) throw Object.assign(new Error("Contract duration is not configured"), { status: 500 });
 
            const startDate = new Date();
            const expireDate = new Date(startDate);
            expireDate.setFullYear(expireDate.getFullYear() + durationYears);
 
            const relativeSignaturePath = `/uploads/signatures/${file.filename}`;

            const created = await Contract.create(
                [{
                    userID,
                    roomID: room._id,
                    startDate,
                    expireDate,
                    propertyDeposit: room.deposit,
                    rentPrice: room.price, 
                    status: ContractStatus.ACTIVE,
                    signature: relativeSignaturePath,
                    signedAt: new Date(),
                }],
                { session }
            );
            contract = created[0];
 
            room.status = RoomStatus.RENTED;
            await room.save({ session });
 
            account.status = AccountStatus.ACTIVE;
            await account.save({ session });
 
            await session.commitTransaction();

        } catch (error) {
            await session.abortTransaction();
            cleanupFile(); // rollback DB rồi thì file vật lý cũng phải xoá theo, tránh rác trên disk
            throw error;
        } finally {
            session.endSession();
        }
 
        const accessToken = generateAccessToken({
            role: "user",
            accountID: account!._id.toString(),
            roomID: room!._id.toString(),
            contractID: contract!._id.toString(),
            userID: userID!,
            startDate: contract!.startDate.toISOString(),
        });
 
        sendSuccess(res, {
            accessToken,
            account: {
                accountID: account!._id,
                roomID: account!.roomID,
                username: account!.username,
                role: account!.role,
                status: account!.status,
            },
            user,
            contract: {
                contractID: contract!._id,
                startDate: contract!.startDate.toISOString(),
                expireDate: contract!.expireDate.toISOString(),
                propertyDeposit: contract!.propertyDeposit,
                rent: contract!.rentPrice,
                status: contract!.status,
                signature: contract!.signature,
                signedAt: contract!.signedAt,
            },
        });
    } catch (error: any) {
        if (error?.status) {
            sendError(res, error.status, error.message);
            return;
        }

        next(error)
    }
}