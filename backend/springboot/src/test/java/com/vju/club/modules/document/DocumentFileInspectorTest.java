package com.vju.club.modules.document;

import com.vju.club.config.StorageProperties;
import com.vju.club.modules.document.enums.DocumentFileType;
import com.vju.club.modules.document.exception.DocumentContentMismatchException;
import com.vju.club.modules.document.exception.DocumentTooLargeException;
import com.vju.club.modules.document.exception.EmptyDocumentException;
import com.vju.club.modules.document.exception.InvalidAppDetailKeyException;
import com.vju.club.modules.document.exception.InvalidDocumentNameException;
import com.vju.club.modules.document.exception.SuspiciousDocumentNameException;
import com.vju.club.modules.document.exception.UnsupportedDocumentTypeException;
import com.vju.club.modules.document.service.DocumentFileInspector;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.util.unit.DataSize;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DocumentFileInspectorTest {
    static final byte[] PDF = "%PDF-1.7\n1 0 obj\n<<>>\nendobj\n".getBytes(StandardCharsets.US_ASCII);
    static final byte[] PNG = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13};
    static final byte[] ZIP = {0x50, 0x4B, 0x03, 0x04, 20, 0, 0, 0};
    static final byte[] EXE = {0x4D, 0x5A, (byte) 0x90, 0, 3, 0, 0, 0};

    private final DocumentFileInspector inspector = inspector(DataSize.ofMegabytes(20));

    private static DocumentFileInspector inspector(DataSize max) {
        StorageProperties properties = new StorageProperties();
        properties.setMaxFileSize(max);
        return new DocumentFileInspector(properties);
    }

    private DocumentFileInspector.InspectedFile inspect(String name, byte[] content) {
        return inspector.inspect(name, () -> new ByteArrayInputStream(content));
    }

    @ParameterizedTest
    @ValueSource(strings = {"report.pdf", "Biên bản họp tháng 9.docx", "budget 2026 (final).xlsx", "a.b.c.pdf",
            "slides-v2.pptx", "notes.MD", "photo.JPG"})
    void acceptsOrdinaryNames(String name) {
        assertThat(inspector.checkName(name)).isEqualTo(name);
    }

    @Test
    void trimsAndNormalisesToNfc() {
        String decomposed = "Bie\u0302\u0301n ba\u0309n.pdf";
        assertThat(inspector.checkName("  " + decomposed + "  ")).isEqualTo("Biến bản.pdf");
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   ", "../etc/passwd.pdf", "folder/report.pdf", "C:\\report.pdf", "..\\x.pdf",
            ".hidden.pdf", ".pdf", "report.", "report", "rep<ort>.pdf", "what?.pdf", "a|b.pdf", "a:b.pdf", "a\"b.pdf",
            "star*.pdf", "CON.pdf", "nul.txt", "Com1.docx", "line\nbreak.pdf", "tab\there.pdf", "nul\u0000byte.pdf"})
    void rejectsInvalidNames(String name) {
        assertThatThrownBy(() -> inspector.checkName(name)).isInstanceOf(InvalidDocumentNameException.class)
                .extracting("code").isEqualTo("INVALID_DOCUMENT_NAME");
    }

    @Test
    void rejectsNullName() {
        assertThatThrownBy(() -> inspector.checkName(null)).isInstanceOf(InvalidDocumentNameException.class);
    }

    @Test
    void limitsNameToTwoHundredFiftyFiveBytes() {
        assertThat(inspector.checkName("a".repeat(251) + ".pdf")).hasSize(255);
        assertThatThrownBy(() -> inspector.checkName("a".repeat(252) + ".pdf"))
                .isInstanceOf(InvalidDocumentNameException.class);
        assertThatThrownBy(() -> inspector.checkName("ệ".repeat(100) + ".pdf"))
                .isInstanceOf(InvalidDocumentNameException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"invoice\u202Efdp.exe", "report\u200B.pdf", "\uFEFFreport.pdf", "a\u2066b.pdf",
            "soft\u00ADhyphen.pdf", "invoice.exe.pdf", "photo.JS.png", "data.sh.csv", "scan.bat.jpg",
            "report.pdf .exe", "photo.jpg            .zip", "a   b.pdf"})
    void flagsDisguisedNames(String name) {
        assertThatThrownBy(() -> inspector.checkName(name))
                .isInstanceOfAny(SuspiciousDocumentNameException.class, UnsupportedDocumentTypeException.class);
    }

    @Test
    void rightToLeftOverrideIsSuspiciousNotJustInvalid() {
        assertThatThrownBy(() -> inspector.checkName("invoice\u202Efdp.exe"))
                .isInstanceOf(SuspiciousDocumentNameException.class)
                .extracting("code").isEqualTo("SUSPICIOUS_DOCUMENT_NAME");
        assertThatThrownBy(() -> inspector.checkName("invoice.exe.pdf"))
                .isInstanceOf(SuspiciousDocumentNameException.class)
                .hasMessageContaining(".exe");
    }

    @ParameterizedTest
    @ValueSource(strings = {"setup.exe", "run.sh", "macro.js", "page.html", "image.svg", "tool.jar", "archive.rar",
            "movie.mp4", "data.json"})
    void rejectsTypesOutsideTheAllowList(String name) {
        assertThatThrownBy(() -> inspector.checkName(name)).isInstanceOf(UnsupportedDocumentTypeException.class)
                .extracting("code").isEqualTo("UNSUPPORTED_DOCUMENT_TYPE");
    }

    @Test
    void programsGetAClearerMessage() {
        assertThatThrownBy(() -> inspector.checkName("setup.exe")).hasMessageContaining("Programs");
    }

    @Test
    void typeComesFromTheExtensionIgnoringCase() {
        assertThat(inspector.typeOf("Report.PDF")).isEqualTo(DocumentFileType.PDF);
        assertThat(inspector.typeOf("a.b.docx")).isEqualTo(DocumentFileType.DOCX);
    }

    @Test
    void inspectReturnsSizeTypeAndSha256() {
        var file = inspect("report.pdf", PDF);
        assertThat(file.name()).isEqualTo("report.pdf");
        assertThat(file.type()).isEqualTo(DocumentFileType.PDF);
        assertThat(file.size()).isEqualTo(PDF.length);
        assertThat(file.sha256()).hasSize(64).matches("[0-9a-f]+");
        assertThat(inspect("copy.pdf", PDF).sha256()).isEqualTo(file.sha256());
    }

    @Test
    void acceptsContentMatchingItsExtension() {
        assertThat(inspect("logo.png", PNG).type()).isEqualTo(DocumentFileType.PNG);
        assertThat(inspect("notes.docx", ZIP).type()).isEqualTo(DocumentFileType.DOCX);
        assertThat(inspect("list.csv", "name,email\nA,a@vju.local\n".getBytes(StandardCharsets.UTF_8)).type())
                .isEqualTo(DocumentFileType.CSV);
    }

    @Test
    void rejectsAProgramRenamedToPdf() {
        assertThatThrownBy(() -> inspect("report.pdf", EXE)).isInstanceOf(DocumentContentMismatchException.class)
                .extracting("code").isEqualTo("DOCUMENT_CONTENT_MISMATCH");
    }

    @Test
    void rejectsContentOfAnotherAllowedType() {
        assertThatThrownBy(() -> inspect("photo.png", PDF)).isInstanceOf(DocumentContentMismatchException.class);
        assertThatThrownBy(() -> inspect("report.pdf", PNG)).isInstanceOf(DocumentContentMismatchException.class);
    }

    @Test
    void textFilesMustNotBeBinary() {
        assertThatThrownBy(() -> inspect("readme.txt", EXE)).isInstanceOf(DocumentContentMismatchException.class);
        assertThatThrownBy(() -> inspect("data.csv", new byte[]{'a', 0, 'b'}))
                .isInstanceOf(DocumentContentMismatchException.class);
    }

    @Test
    void rejectsEmptyFiles() {
        assertThatThrownBy(() -> inspect("empty.pdf", new byte[0])).isInstanceOf(EmptyDocumentException.class)
                .extracting("code").isEqualTo("EMPTY_DOCUMENT");
    }

    @Test
    void rejectsFilesOverTheLimitWhileReading() {
        DocumentFileInspector small = inspector(DataSize.ofBytes(16));
        assertThat(small.inspect("ok.pdf", () -> new ByteArrayInputStream("%PDF-1.7 tiny".getBytes())).size()).isEqualTo(13);
        assertThatThrownBy(() -> small.inspect("big.pdf", () -> new ByteArrayInputStream(PDF)))
                .isInstanceOf(DocumentTooLargeException.class)
                .extracting("status").hasToString("413 PAYLOAD_TOO_LARGE");
    }

    @Test
    void nameIsCheckedBeforeContentIsRead() {
        assertThatThrownBy(() -> inspector.inspect("../x.pdf", () -> { throw new AssertionError("content read"); }))
                .isInstanceOf(InvalidDocumentNameException.class);
    }

    @Test
    void appDetailKeyIsOptionalDotSeparatedLowerCase() {
        assertThat(inspector.checkAppDetailKey(null)).isNull();
        assertThat(inspector.checkAppDetailKey("  ")).isNull();
        assertThat(inspector.checkAppDetailKey(" club.rules ")).isEqualTo("club.rules");
        assertThat(inspector.checkAppDetailKey("event.report_2026")).isEqualTo("event.report_2026");
        for (String bad : new String[]{"Club.Rules", "club..rules", ".club", "club.", "1club", "club rules",
                "club/rules", "a".repeat(101)}) {
            assertThatThrownBy(() -> inspector.checkAppDetailKey(bad)).as(bad)
                    .isInstanceOf(InvalidAppDetailKeyException.class);
        }
    }
}
