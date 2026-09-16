// utils/pagination.ts
export interface PaginationOptions {
  defaultLimit?: number;
  maxLimit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Parse + clamp page/limit từ query string, trả kèm skip để dùng thẳng cho .skip(). */
export const parsePagination = (
  page: unknown,
  limit: unknown,
  options: PaginationOptions = {},
): { page: number; limit: number; skip: number } => {
  const { defaultLimit = 12, maxLimit = 100 } = options;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(maxLimit, Math.max(1, Number(limit) || defaultLimit));

  return { page: pageNum, limit: limitNum, skip: (pageNum - 1) * limitNum };
};

/** Build object pagination trả cho client. Dùng chung dù total đến từ countDocuments() hay mảng in-memory (mapped.length). */
export const buildPaginationMeta = (total: number, page: number, limit: number): PaginationMeta => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});

/** Cắt trang cho mảng đã có sẵn trong memory — dùng khi phải search/filter bằng field tính toán ở JS (vd displayID bên getInvoiceList). */
export const paginateArray = <T>(
  items: T[],
  page: number,
  limit: number,
): { data: T[]; meta: PaginationMeta } => {
  const data = items.slice((page - 1) * limit, page * limit);
  return { data, meta: buildPaginationMeta(items.length, page, limit) };
};