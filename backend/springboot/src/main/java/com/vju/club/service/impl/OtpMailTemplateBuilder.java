package com.vju.club.service.impl;

/**
 * Builds compact, mobile-friendly HTML + Plaintext OTP emails strictly adhering to the
 * VJU ClubHub 60/30/10 3-tone color palette:
 * - 60% Neutral White/Canvas: #FFFFFF, #F8FAFC, #F1F5F9
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
                ? "[VJU ClubHub] Email kiểm tra SMTP & OTP"
                : "[VJU ClubHub] Mã OTP đặt lại mật khẩu: " + otpCode;

        String introLine = testPreview
                ? "Kết nối SMTP hoạt động tốt. Dưới đây là mã OTP mẫu:"
                : "Mã xác thực đặt lại mật khẩu cho tài khoản " + recipientEmail + " của bạn là:";

        String plainText = """
                VJU CLUBHUB
                Xin chào %s,

                %s %s
                Hiệu lực: %d phút · Tối đa %d lần nhập.
                Không chia sẻ mã này cho bất kỳ ai.

                -- Trường Đại học Việt Nhật · ĐHQGHN
                """.formatted(
                displayName,
                introLine,
                otpCode,
                expiryMinutes,
                maxVerifyAttempts);

        String heading = testPreview ? "Kiểm tra gửi thư thành công" : "Mã OTP đặt lại mật khẩu";

        String html = """
                <!DOCTYPE html>
                <html lang="vi">
                <head>
                  <meta charset="UTF-8" />
                  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                  <title>%s</title>
                </head>
                <body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0F172A;">
                  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F8FAFC;padding:20px 12px;">
                    <tr>
                      <td align="center">
                        <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="max-width:420px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
                          <tr>
                            <td style="height:4px;background-color:#8E1F32;font-size:0;line-height:0;">&nbsp;</td>
                          </tr>
                          <tr>
                            <td style="padding:20px 24px;">
                              <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#8E1F32;">
                                VJU CLUBHUB
                              </p>
                              <h1 style="margin:4px 0 12px 0;font-size:18px;line-height:1.3;font-weight:800;color:#0F172A;">
                                %s
                              </h1>
                              <p style="margin:0 0 14px 0;font-size:13px;line-height:1.55;color:#334155;">
                                Xin chào <strong>%s</strong>, %s
                              </p>
                              <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FFF1F2;border:1px solid #FECDD3;border-radius:10px;margin:0 0 14px 0;">
                                <tr>
                                  <td align="center" style="padding:14px 12px;">
                                    <p style="margin:0;font-family:'SFMono-Regular',Consolas,Menlo,monospace;font-size:28px;line-height:1.15;font-weight:800;letter-spacing:6px;color:#8E1F32;">
                                      %s
                                    </p>
                                  </td>
                                </tr>
                              </table>
                              <p style="margin:0;font-size:12px;line-height:1.5;color:#64748B;">
                                Hiệu lực <strong style="color:#0F172A;">%d phút</strong> &middot; Tối đa <strong style="color:#0F172A;">%d lần</strong> nhập &middot; Không chia sẻ mã này.
                              </p>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:10px 24px;background-color:#F8FAFC;border-top:1px solid #F1F5F9;font-size:11px;color:#64748B;">
                              Trường Đại học Việt Nhật &middot; ĐHQGHN
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
                escapeHtml(displayName),
                escapeHtml(introLine),
                escapeHtml(formattedOtp),
                expiryMinutes,
                maxVerifyAttempts);

        return new RenderedEmail(subject, plainText, html);
    }

    public static RenderedEmail buildNotificationAlert(
            String recipientName,
            String recipientEmail,
            String title,
            String message) {
        return buildNotificationAlert(recipientName, recipientEmail, title, message, null);
    }

    public static RenderedEmail buildNotificationAlert(
            String recipientName,
            String recipientEmail,
            String title,
            String message,
            String referenceType) {
        String displayName = resolveDisplayName(recipientName, recipientEmail);
        String safeTitle = resolveSafeTitle(title);
        String safeMessage = resolveSafeMessage(message);
        String badgeLabel = resolveNotificationBadge(referenceType);
        String subject = "[VJU ClubHub] " + safeTitle;

        String plainText = """
                VJU CLUBHUB · %s
                Xin chào %s,

                %s
                %s

                Mở hệ thống VJU ClubHub để xem chi tiết và phản hồi kịp thời.
                Bạn có thể tắt email thông báo tại mục Hồ sơ cá nhân (/profile).
                -- Trường Đại học Việt Nhật · ĐHQGHN
                """.formatted(badgeLabel, displayName, safeTitle, safeMessage);

        String html = buildNotificationAlertHtml(displayName, recipientEmail, safeTitle, safeMessage, referenceType);
        return new RenderedEmail(subject, plainText, html);
    }

    public static String buildNotificationAlertHtml(
            String recipientName,
            String recipientEmail,
            String title,
            String message,
            String referenceType) {
        String displayName = resolveDisplayName(recipientName, recipientEmail);
        String safeTitle = resolveSafeTitle(title);
        String safeMessage = resolveSafeMessage(message);
        String badgeLabel = resolveNotificationBadge(referenceType);
        String subject = "[VJU ClubHub] " + safeTitle;
        String escapedMessageHtml = escapeHtml(safeMessage)
                .replace("\r\n", "\n")
                .replace("\n", "<br />");

        return """
                <!DOCTYPE html>
                <html lang="vi">
                <head>
                  <meta charset="UTF-8" />
                  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                  <title>%s</title>
                </head>
                <body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0F172A;">
                  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F8FAFC;padding:20px 12px;">
                    <tr>
                      <td align="center">
                        <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
                          <tr>
                            <td style="height:4px;background-color:#8E1F32;font-size:0;line-height:0;">&nbsp;</td>
                          </tr>
                          <tr>
                            <td style="padding:20px 24px;">
                              <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px 0;">
                                <tr>
                                  <td style="vertical-align:middle;">
                                    <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#8E1F32;">
                                      VJU CLUBHUB &middot; THÔNG BÁO
                                    </p>
                                  </td>
                                  <td align="right" style="vertical-align:middle;">
                                    <span style="display:inline-block;background-color:#FFF1F2;border:1px solid #FECDD3;border-radius:999px;padding:3px 10px;font-size:11px;font-weight:700;color:#8E1F32;">
                                      %s
                                    </span>
                                  </td>
                                </tr>
                              </table>
                              <h1 style="margin:4px 0 12px 0;font-size:17px;line-height:1.35;font-weight:800;color:#0F172A;">
                                %s
                              </h1>
                              <p style="margin:0 0 12px 0;font-size:13px;line-height:1.55;color:#334155;">
                                Xin chào <strong>%s</strong>,
                              </p>
                              <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:12px 14px;margin:0 0 14px 0;font-size:13px;line-height:1.6;color:#0F172A;">
                                %s
                              </div>
                              <p style="margin:0;font-size:12px;line-height:1.55;color:#475569;">
                                Mở hệ thống VJU ClubHub để xem chi tiết và phản hồi kịp thời.
                              </p>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:12px 24px;background-color:#F8FAFC;border-top:1px solid #F1F5F9;font-size:11px;line-height:1.5;color:#64748B;">
                              Trường Đại học Việt Nhật &middot; ĐHQGHN &middot; Có thể tắt email thông báo tại Hồ sơ cá nhân.
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
                escapeHtml(badgeLabel),
                escapeHtml(safeTitle),
                escapeHtml(displayName),
                escapedMessageHtml);
    }

    static String resolveNotificationBadge(String referenceType) {
        if (referenceType == null || referenceType.isBlank()) {
            return "Thông báo";
        }
        return switch (referenceType.trim()) {
            case "CLUB_APPLICATION" -> "Tuyển thành viên & Phỏng vấn";
            case "DEPARTMENT" -> "Phân ban CLB";
            case "TASK" -> "Công việc";
            case "EVENT" -> "Sự kiện";
            case "CLUB" -> "Thông báo CLB";
            default -> "Thông báo";
        };
    }

    private static String resolveDisplayName(String recipientName, String recipientEmail) {
        if (recipientName != null && !recipientName.isBlank()) {
            return recipientName.trim();
        }
        if (recipientEmail != null && !recipientEmail.isBlank()) {
            return recipientEmail.trim();
        }
        return "Thành viên VJU";
    }

    private static String resolveSafeTitle(String title) {
        return (title == null || title.isBlank()) ? "Thông báo mới từ CLB" : title.trim();
    }

    private static String resolveSafeMessage(String message) {
        return (message == null || message.isBlank()) ? "" : message.trim();
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
