import { Types } from 'mongoose';
import { RequestType, TicketType } from "../models/enums.js";
import { formatVNShortDate } from "./dateFormat.js";

const REQUEST_PREFIX: Record<RequestType, string> = {
    [RequestType.CONSUMP]: 'CON',
    [RequestType.DELAY]: 'DEL',
    [RequestType.CHECKOUT]: 'CHE',
    [RequestType.PAID]: 'PAI',
    [RequestType.EXTEND]: 'EXT',
    [RequestType.MOVEOUT]: 'MOV',
};

const TICKET_PREFIX: Record<TicketType, string> = {
    [TicketType.COMPLAIN]: 'CP',  
    [TicketType.REPAIR]: 'RP',
};

// Request: PREFIX-roomCode-ddmmyy, vd "DEL-A-101-300926"
export const buildRequestDisplayID = (type: RequestType, roomCode: string, date: Date = new Date()): string => {
    const prefix = REQUEST_PREFIX[type] || 'REQ';
    return `${prefix}-${roomCode}-${formatVNShortDate(date)}`.toUpperCase();
};

// Invoice: roomCode-ddmmyy (ngày tạo invoice), vd "A-101-160926"
export const buildInvoiceDisplayID = (roomCode: string, createdDate: Date): string =>
    `${roomCode}-${formatVNShortDate(createdDate)}`.toUpperCase();

// Contract: roomCode-startDDMMYY, vd "A-101-010126"
export const buildContractDisplayID = (roomCode: string, startDate: Date): string =>
    `${roomCode}-${formatVNShortDate(startDate)}`.toUpperCase();

// Ticket: PREFIX-roomCode-ddmmyy-last3DigitOfOriginId, vd "RP-A-101-170926-6A7"
export const buildTicketDisplayID = (type: TicketType, roomCode: string, date: Date = new Date(), id: Types.ObjectId): string => {
    const prefix = TICKET_PREFIX[type] || 'TK';
    const last3Digits = id.toString().slice(-3);
    return `${prefix}-${roomCode}-${formatVNShortDate(date)}-${last3Digits}`.toUpperCase();
};
