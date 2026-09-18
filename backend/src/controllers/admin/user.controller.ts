import { NextFunction, Response } from "express";
import User from "../../models/User.js";
import Contract from "../../models/Contract.js";
import Room from "../../models/Room.js";
import { Sex, ContractStatus } from "../../models/enums.js";
import { AdminAuthRequest } from "../../middlewares/auth.middleware.js";
import { sendError, sendSuccess } from "../../utils/response.js";
import { buildPaginationMeta, parsePagination } from "../../utils/pagination.js";

// Get list users (Admin / Users) — read-only, join active/latest contract -> room
// GET /api/admin/users
export const getUsers = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { search, sex, nationality, page, limit } = req.query;

        // validate input
        const allowedSex = [Sex.MALE, Sex.FEMALE, Sex.OTHER];
        if (sex && !allowedSex.includes(sex as Sex)) {
            sendError(res, 400, "Invalid sex filter");
            return;
        }
        // validate + clamp pagination
        const { page: pageNum, limit: limitNum } = parsePagination(page, limit);

        // Bước 1: filter trực tiếp ở DB cho field nằm thẳng trên User
        const filter: any = {};
        if (sex) filter.sex = sex;
        if (nationality) filter.nationality = nationality;

        const users = await User.find(filter).sort({ createdAt: -1 });
        const userIds = users.map((u) => u._id);

        // Bước 2: lấy contract của các user này — ưu tiên active, không có thì lấy mới nhất theo startDate
        const contracts = await Contract.find({ userID: { $in: userIds } }).sort({ startDate: -1 });
        const contractByUser = new Map<string, (typeof contracts)[number]>();
        for (const c of contracts) {
            const key = c.userID.toString();
            const existing = contractByUser.get(key);
            if (!existing) {
                contractByUser.set(key, c);
                continue;
            }
            if (existing.status !== ContractStatus.ACTIVE && c.status === ContractStatus.ACTIVE) {
                contractByUser.set(key, c);
            }
        }

        // Bước 3: lấy room tương ứng để có roomCode
        const roomIds = [...contractByUser.values()].map((c) => c.roomID);
        const rooms = await Room.find({ _id: { $in: roomIds } }).select("roomCode");
        const roomCodeById = new Map(rooms.map((r) => [r._id.toString(), r.roomCode]));

        let mapped = users.map((u) => {
            const contract = contractByUser.get(u._id.toString());
            const roomCode = contract ? roomCodeById.get(contract.roomID.toString()) ?? null : null;
            return {
                userID: u._id,
                fullName: u.fullName,
                dob: u.DoB,
                phoneNumber: u.phoneNumber,
                identityNo: u.identityNo,
                sex: u.sex,
                nationality: u.nationality,
                por: u.PoR,
                roomCode,
                contractID: contract ? contract._id : null,
                contractStatus: contract ? contract.status : null,
            };
        });

        // Bước 4: search theo fullName/phoneNumber/identityNo/roomCode — xử lý trong JS vì roomCode là field đã join
        if (search) {
            const searchStr = String(search).trim().toLowerCase();
            mapped = mapped.filter(
                (item) =>
                    item.fullName.toLowerCase().includes(searchStr) ||
                    item.phoneNumber.toLowerCase().includes(searchStr) ||
                    item.identityNo.toLowerCase().includes(searchStr) ||
                    (item.roomCode ? item.roomCode.toLowerCase().includes(searchStr) : false)
            );
        }

        // Bước 5: phân trang sau khi đã search xong
        const total = mapped.length;
        const data = mapped.slice((pageNum - 1) * limitNum, pageNum * limitNum);

        sendSuccess(res, {
            items: data,
            pagination: buildPaginationMeta(total, pageNum, limitNum),
        });
    } catch (error) {
        next(error);
    }
};