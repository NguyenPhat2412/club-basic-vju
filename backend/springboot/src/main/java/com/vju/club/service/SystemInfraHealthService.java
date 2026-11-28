package com.vju.club.service;

import com.vju.club.dto.response.SystemInfraHealthResponse;
import com.vju.club.security.Actor;

public interface SystemInfraHealthService {
    SystemInfraHealthResponse inspect(Actor actor);
}
