package com.vju.club.modules.club.common;

public final class ClubConstants {

    private ClubConstants() {
    }

    public static final String PERMISSION_VIEW = "club.view";
    public static final String PERMISSION_CREATE = "club.create";
    public static final String PERMISSION_UPDATE = "club.update";
    public static final String PERMISSION_STATUS = "club.status";

    public static final String CLUB_CODE_PATTERN = "^[A-Za-z0-9_.-]{1,50}$";
    public static final int MAX_CODE_LENGTH = 50;
    public static final int MAX_NAME_LENGTH = 200;
    public static final int MAX_URL_LENGTH = 500;
    public static final int MAX_EMAIL_LENGTH = 320;
}
