package com.vju.club.dto.response;

import java.util.List;
import java.util.UUID;

public record DocumentNamesResponse(UUID clubId, boolean deleted, List<String> names) { }
