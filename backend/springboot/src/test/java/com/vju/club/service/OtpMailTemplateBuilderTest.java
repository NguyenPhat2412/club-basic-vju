package com.vju.club.service;

import com.vju.club.service.impl.OtpMailTemplateBuilder;
import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

class OtpMailTemplateBuilderTest {
    private static final Pattern HEX_COLOR = Pattern.compile("#[0-9A-Fa-f]{6}\\b");
    private static final Set<String> ALLOWED_THREE_TONE_HEX = Set.of(
            // 60% Neutral White / Canvas
            "#FFFFFF", "#F8FAFC", "#F1F5F9",
            // 30% Structural Slate
            "#0F172A", "#334155", "#475569", "#64748B", "#E2E8F0",
            // 10% VJU Crimson Accent
            "#8E1F32", "#FFF1F2", "#FECDD3");

    @Test
    void rendersBrandedThreeToneHtmlWithEscapedContentAndZeroOffPaletteColors() {
        var rendered = OtpMailTemplateBuilder.buildPasswordResetOtp(
                "Nguyễn <Admin> & CLB",
                "student@st.vju.ac.vn",
                "482910",
                5,
                4,
                false);

        assertThat(rendered.subject()).isEqualTo("[VJU ClubHub] Mã OTP đặt lại mật khẩu: 482910");
        assertThat(rendered.plainText()).contains("482910").contains("5 phút").contains("4 lần");
        assertThat(rendered.html())
                .contains("482 910")
                .contains("Nguyễn &lt;Admin&gt; &amp; CLB")
                .doesNotContain("Nguyễn <Admin>");

        Matcher matcher = HEX_COLOR.matcher(rendered.html());
        while (matcher.find()) {
            String hex = matcher.group().toUpperCase();
            assertThat(ALLOWED_THREE_TONE_HEX)
                    .as("Email template hex color %s must strictly belong to VJU 60/30/10 3-tone palette", hex)
                    .contains(hex);
        }
    }
}
