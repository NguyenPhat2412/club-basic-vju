package com.vju.club.dto.request;

import com.vju.club.common.DocumentConstants;
import jakarta.validation.constraints.Size;

public record DocumentPatchRequest(
        @Size(max = DocumentConstants.MAX_NAME_LENGTH) String name,
        @Size(max = DocumentConstants.MAX_APP_DETAIL_KEY_LENGTH) String appDetailKey) { }
