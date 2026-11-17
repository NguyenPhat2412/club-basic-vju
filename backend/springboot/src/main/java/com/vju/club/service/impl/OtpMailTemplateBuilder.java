package com.vju.club.service.impl;

/**
 * Builds responsive HTML + Plaintext transactional emails strictly adhering to the
 * VJU ClubHub 60/30/10 3-tone color palette:
 * - 60% Neutral White/Canvas: #FFFFFF, #F8FAFC
 * - 30% Structural Slate: #0F172A, #334155, #475569, #64748B, #E2E8F0
 * - 10% VJU Crimson Accent: #8E1F32, #FFF1F2, #FECDD3
 */
public final class OtpMailTemplateBuilder {
    private OtpMailTemplateBuilder() {
    }

    public record RenderedEmail(String subject, String plainText, String html) {
    }

    public static RenderedEmail buildPasswordResetOtp(
            String recipientName,
            String recipientEmail,
            String otpCode,
            int expiryMinutes,
            int maxVerifyAttempts,
            boolean testPreview) {
        String displayName = (recipientName == null || recipientName.isBlank()) ? recipientEmail : recipientName.trim();
        String formattedOtp = otpCode.length() == 6
                ? otpCode.substring(0, 3) + " " + otpCode.substring(3)
                : otpCode;

        String subject = testPreview
                ? "[VJU ClubHub] Kiểm tra cấu hình gửi email & giao diện OTP"
                : "[VJU ClubHub] Mã OTP đặt lại mật khẩu: " + otpCode;

        String introLine = testPreview
                ? "Đây là email kiểm tra được gửi trực tiếp từ trang Cài đặt hệ thống VJU ClubHub để xác nhận kết nối máy chủ SMTP và kiểm tra thiết kế mẫu thư mã xác thực OTP."
                : "Hệ thống VJU ClubHub vừa nhận được yêu cầu đặt lại mật khẩu cho tài khoản gắn với địa chỉ "
                        + recipientEmail + ". Vui lòng nhập mã xác thực 6 chữ số dưới đây trên cửa sổ Khôi phục tài khoản:";

        String plainText = """
                VIETNAM JAPAN UNIVERSITY · VJU CLUBHUB
                %s

                Xin chào %s,

                %s

                Mã xác thực OTP: %s
                - Thời gian hiệu lực: %d phút
                - Số lần nhập tối đa: %d lần

                Lưu ý bảo mật: Tuyệt đối không chia sẻ mã xác thực này cho bất kỳ ai. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này; mật khẩu hiện tại của bạn vẫn an toàn.

                --
                Trường Đại học Việt Nhật · ĐHQGHN — VJU ClubHub
                Learn · Connect · Create
                """.formatted(
                testPreview ? "KIỂM TRA KẾT NỐI EMAIL HỆ THỐNG" : "KHÔI PHỤC MẬT KHẨU TÀI KHOẢN",
                displayName,
                introLine,
                otpCode,
                expiryMinutes,
                maxVerifyAttempts);

        String badgeLabel = testPreview ? "EMAIL KIỂM TRA HỆ THỐNG" : "MÃ XÁC THỰC BẢO MẬT · OTP";
        String heading = testPreview ? "Kết nối máy chủ gửi thư thành công" : "Mã xác thực đặt lại mật khẩu";
        String codeCaption = testPreview ? "MÃ OTP MẪU TRÌNH DIỄN" : "MÃ XÁC THỰC 6 CHỮ SỐ CỦA BẠN";

        String html = """
                <!DOCTYPE html>
                <html lang="vi">
                <head>
                  <meta charset="UTF-8" />
                  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                  <title>%s</title>
                </head>
                <body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0F172A;-webkit-font-smoothing:antialiased;">
                  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F8FAFC;padding:32px 16px;">
                    <tr>
                      <td align="center">
                        <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;box-shadow:0 4px 18px rgba(15,23,42,0.05);">
                          <tr>
                            <td style="height:6px;background-color:#8E1F32;font-size:0;line-height:0;">&nbsp;</td>
                          </tr>
                          <tr>
                            <td style="padding:28px 32px 20px 32px;border-bottom:1px solid #F1F5F9;">
                              <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                  <td>
                                    <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8E1F32;">
                                      VIETNAM JAPAN UNIVERSITY &middot; CLUBHUB
                                    </p>
                                    <h1 style="margin:8px 0 0 0;font-size:22px;line-height:1.3;font-weight:800;color:#0F172A;">
                                      %s
                                    </h1>
                                  </td>
                                  <td align="right" valign="top">
                                    <span style="display:inline-block;padding:5px 10px;border-radius:999px;background-color:#FFF1F2;border:1px solid #FECDD3;font-size:10px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#8E1F32;white-space:nowrap;">
                                      %s
                                    </span>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:24px 32px 28px 32px;">
                              <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#0F172A;">
                                Xin chào <strong>%s</strong>,
                              </p>
                              <p style="margin:0 0 22px 0;font-size:14px;line-height:1.65;color:#334155;">
                                %s
                              </p>

                              <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FFF1F2;border:1.5px solid #FECDD3;border-radius:14px;margin:0 0 22px 0;">
                                <tr>
                                  <td align="center" style="padding:22px 20px;">
                                    <p style="margin:0 0 8px 0;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8E1F32;">
                                      %s
                                    </p>
                                    <p style="margin:0;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:34px;line-height:1.15;font-weight:800;letter-spacing:8px;color:#8E1F32;">
                                      %s
                                    </p>
                                  </td>
                                </tr>
                              </table>

                              <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;margin:0 0 20px 0;">
                                <tr>
                                  <td width="50%%" style="padding:12px 16px;border-right:1px solid #E2E8F0;">
                                    <p style="margin:0;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#64748B;">
                                      Thời gian hiệu lực
                                    </p>
                                    <p style="margin:4px 0 0 0;font-size:14px;font-weight:700;color:#0F172A;">
                                      %d phút
                                    </p>
                                  </td>
                                  <td width="50%%" style="padding:12px 16px;">
                                    <p style="margin:0;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#64748B;">
                                      Giới hạn xác thực
                                    </p>
                                    <p style="margin:4px 0 0 0;font-size:14px;font-weight:700;color:#0F172A;">
                                      Tối đa %d lần nhập
                                    </p>
                                  </td>
                                </tr>
                              </table>

                              <p style="margin:0;padding:12px 14px;background-color:#F8FAFC;border-left:3px solid #8E1F32;border-radius:6px;font-size:12.5px;line-height:1.6;color:#475569;">
                                <strong style="color:#0F172A;">Lưu ý bảo mật:</strong> Ban Quản trị VJU ClubHub không bao giờ yêu cầu bạn cung cấp mã OTP qua tin nhắn hay điện thoại. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua thư này.
                              </p>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:18px 32px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;">
                              <p style="margin:0;font-size:12px;font-weight:700;color:#334155;">
                                Trường Đại học Việt Nhật &middot; ĐHQGHN &mdash; VJU ClubHub
                              </p>
                              <p style="margin:4px 0 0 0;font-size:11.5px;line-height:1.5;color:#64748B;">
                                Cổng Quản lý Hoạt động Câu lạc bộ Sinh viên &middot; Learn &middot; Connect &middot; Create
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """.formatted(
                escapeHtml(subject),
                escapeHtml(heading),
                escapeHtml(badgeLabel),
                escapeHtml(displayName),
                escapeHtml(introLine),
                escapeHtml(codeCaption),
                escapeHtml(formattedOtp),
                expiryMinutes,
                maxVerifyAttempts);

        return new RenderedEmail(subject, plainText, html);
    }

    static String escapeHtml(String value) {
        if (value == null || value.isEmpty()) {
            return "";
        }
        StringBuilder out = new StringBuilder(value.length() + 16);
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            switch (c) {
                case '&' -> out.append("&amp;");
                case '<' -> out.append("&lt;");
                case '>' -> out.append("&gt;");
                case '"' -> out.append("&quot;");
                case '\'' -> out.append("&#39;");
                default -> out.append(c);
            }
        }
        return out.toString();
    }
}
