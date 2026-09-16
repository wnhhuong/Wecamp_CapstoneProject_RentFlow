// Việt Nam không có DST -> offset cố định quanh năm, không cần thư viện timezone
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Trả về "ddmmyy" theo giờ Việt Nam, tính từ 1 Date (UTC nội bộ của Mongo/JS).
 * Cố ý dùng getUTC*() sau khi cộng offset thủ công — KHÔNG dùng getDate()/getMonth()
 * trực tiếp, vì các hàm đó đọc theo múi giờ của tiến trình Node đang chạy (process.env.TZ),
 * thường là UTC trên server, không phải giờ Việt Nam như giả định nghiệp vụ.
 */
export const formatVNShortDate = (date: Date): string => {
    const vnTime = new Date(date.getTime() + VN_OFFSET_MS);
    const day = vnTime.getUTCDate().toString().padStart(2, "0");
    const month = (vnTime.getUTCMonth() + 1).toString().padStart(2, "0");
    const year = (vnTime.getUTCFullYear() % 100).toString().padStart(2, "0");
    return `${day}${month}${year}`;
};

// Dùng khi cần đủ cả 3 phần riêng (vd để build khoảng ngày, so sánh...) thay vì chuỗi ghép sẵn
export const getVNDateParts = (date: Date): { day: number; month: number; year: number } => {
    const vnTime = new Date(date.getTime() + VN_OFFSET_MS);
    return {
        day: vnTime.getUTCDate(),
        month: vnTime.getUTCMonth() + 1,
        year: vnTime.getUTCFullYear(),
    };
};