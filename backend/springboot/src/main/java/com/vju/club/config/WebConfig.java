package com.vju.club.config;

import lombok.RequiredArgsConstructor;
import com.vju.club.security.Actor;
import com.vju.club.security.ActorArgumentResolver;
import org.springdoc.core.utils.SpringDocUtils;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {
    static {
        SpringDocUtils.getConfig().addRequestWrapperToIgnore(Actor.class);
    }

    private final ActorArgumentResolver actorArgumentResolver;

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(actorArgumentResolver);
    }
}
