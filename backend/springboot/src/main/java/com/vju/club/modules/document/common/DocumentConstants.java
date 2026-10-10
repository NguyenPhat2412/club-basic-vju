package com.vju.club.modules.document.common;

import java.util.Set;

public final class DocumentConstants {
    private DocumentConstants() {
    }

    public static final String PERMISSION_VIEW = "document.view";
    public static final String PERMISSION_UPLOAD = "document.upload";
    public static final String PERMISSION_UPDATE = "document.update";
    public static final String PERMISSION_DELETE = "document.delete";
    public static final String PERMISSION_RESTORE = "document.restore";

    public static final int MAX_NAME_LENGTH = 255;
    public static final int MAX_APP_DETAIL_KEY_LENGTH = 100;
    public static final String APP_DETAIL_KEY_PATTERN = "^[a-z][a-z0-9_]*(\\.[a-z][a-z0-9_]*)*$";

    public static final int SIGNATURE_BYTES = 8192;

    public static final String FORBIDDEN_NAME_CHARACTERS = "<>:\"|?*";

    public static final Set<String> WINDOWS_RESERVED_NAMES = Set.of(
            "con", "prn", "aux", "nul",
            "com1", "com2", "com3", "com4", "com5", "com6", "com7", "com8", "com9",
            "lpt1", "lpt2", "lpt3", "lpt4", "lpt5", "lpt6", "lpt7", "lpt8", "lpt9");

    public static final Set<String> EXECUTABLE_EXTENSIONS = Set.of(
            "exe", "com", "bat", "cmd", "msi", "scr", "pif", "cpl", "dll", "sys",
            "js", "jse", "vbs", "vbe", "wsf", "ps1", "psm1", "sh", "bash", "jar", "apk",
            "app", "dmg", "php", "py", "pl", "rb", "html", "htm", "svg", "hta", "lnk", "reg");
}
