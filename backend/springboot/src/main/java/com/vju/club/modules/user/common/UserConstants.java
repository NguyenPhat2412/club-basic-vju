package com.vju.club.modules.user.common;

public final class UserConstants {

    private UserConstants() {
    }

    public static final String PERMISSION_VIEW = "user.view";
    public static final String PERMISSION_MANAGE = "user.manage";

    public static final String DEFAULT_SORT_BY = "createdAt";
    public static final String DEFAULT_SORT_DIRECTION = "desc";

    public static final int MIN_PASSWORD_LENGTH = 8;
    public static final int MAX_PASSWORD_LENGTH = 100;
    /** BCrypt refuses longer input, so this is the real upper bound (accented characters take 2-3 bytes). */
    public static final int MAX_PASSWORD_BYTES = 72;
    public static final String PHONE_PATTERN = "^[0-9+().\\- ]*$";
    /**
     * Images and links shown by the frontend must be plain web URLs (no javascript: or data: URLs).
     * An empty string stays allowed because PATCH uses it to clear the field.
     */
    public static final String WEB_URL_PATTERN = "^(https?://.+)?$";
}
