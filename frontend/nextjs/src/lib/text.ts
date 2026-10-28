// Vietnamese writes each syllable as its own word, so the browser may wrap inside a compound word
// ("cộng / đồng"). keepWords joins the compounds below with non-breaking spaces so they wrap as one.
const COMPOUNDS = [
  "câu lạc bộ", "cộng đồng", "sinh viên", "thành viên", "Trường Đại học", "Đại học", "Quốc gia", "Việt Nhật", "Hà Nội",
  "Hòa Lạc", "Việt Nam", "hành trình", "bắt đầu", "phù hợp", "sở thích", "trải nghiệm", "đáng nhớ", "học thuật",
  "văn hóa", "hoạt động", "hào hứng", "lớp học", "thế giới", "gặp gỡ", "dự án", "sự kiện", "khởi xướng", "bản sắc",
  "năng động", "tin tức", "đăng nhập", "đăng ký", "tài khoản", "không gian", "cổng thông tin", "thông tin", "sắc màu",
  "khám phá", "đời sống", "tham gia", "nộp đơn", "trực tuyến", "liên kết",
];
const escape = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const PATTERN = new RegExp(COMPOUNDS.sort((a, b) => b.length - a.length).map(escape).join("|"), "giu");

export const keepWords = (text: string) => text.replace(PATTERN, (match) => match.replace(/ /g, " "));
