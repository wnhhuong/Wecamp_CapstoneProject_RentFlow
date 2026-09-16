import CheckoutRequest from "../models/CheckoutRequest.js";
import ConsumpRequest from "../models/ConsumpRequest.js";
import { RequestType } from "../models/enums.js";
import ExtendRequest from "../models/ExtendRequest.js";
import LatePaymentRequest from "../models/LatePaymentRequest.js";
import MoveoutRequest from "../models/MoveoutRequest.js";
import PaidRequest from "../models/PaidRequest.js";

export const DETAIL_MODEL_MAP: Record<RequestType, any> = {
    [RequestType.CHECKOUT]: CheckoutRequest,
    [RequestType.CONSUMP]: ConsumpRequest,
    [RequestType.EXTEND]: ExtendRequest,
    [RequestType.DELAY]: LatePaymentRequest,
    [RequestType.MOVEOUT]: MoveoutRequest,
    [RequestType.PAID]: PaidRequest,
};

export const buildDetails = (type: RequestType, doc: any): Record<string, any> | null => {
    switch (type) {
        case RequestType.CHECKOUT:
            return {
                contractID: doc.contractID,
                finalImage: doc.finalImage,
                finalReading: doc.finalReading,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
            };
        case RequestType.CONSUMP:
            return {
                image: doc.image,
                reading: doc.reading,
                capturedAt: doc.capturedAt,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
            };
        case RequestType.EXTEND:
            return {
                contractID: doc.contractID,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
            };
        case RequestType.DELAY:
            return {
                invoiceID: doc.invoiceID,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
            };
        case RequestType.MOVEOUT:
            return {
                contractID: doc.contractID,
                requestMoveoutDate: doc.requestMoveoutDate,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
            };
        case RequestType.PAID:
            return {
                invoiceID: doc.invoiceID,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
            };
        default:
            return null;
    }
};