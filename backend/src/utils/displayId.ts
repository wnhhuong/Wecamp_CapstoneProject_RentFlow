import { RequestType } from "../models/enums.js";
import { formatVNShortDate } from "./dateFormat.js";

const REQUEST_PREFIX: Record<RequestType, string> = {
    [RequestType.CONSUMP]: 'CON',
    [RequestType.DELAY]: 'DEL',
    [RequestType.CHECKOUT]: 'CHE',
    [RequestType.PAID]: 'PAI',
    [RequestType.EXTEND]: 'EXT',
    [RequestType.MOVEOUT]: 'MOV',
};

// Request: PREFIX-roomCode-ddmmyy, vd "DEL-A-101-300926"
export const buildRequestDisplayID = (type: RequestType, roomCode: string, date: Date = new Date()): string => {
    const prefix = REQUEST_PREFIX[type] || 'REQ';
    return `${prefix}-${roomCode}-${formatVNShortDate(date)}`;
};

// Invoice: roomCode-ddmmyy (ngày tạo invoice), vd "A-101-160926"
export const buildInvoiceDisplayID = (roomCode: string, createdDate: Date): string =>
    `${roomCode}-${formatVNShortDate(createdDate)}`;

// Contract: roomCode-startDDMMYY, vd "A-101-010126"
export const buildContractDisplayID = (roomCode: string, startDate: Date): string =>
    `${roomCode}-${formatVNShortDate(startDate)}`;