package com.vju.club.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.SchedulingConfigurer;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;

import java.util.concurrent.Executor;

/**
 * Centralized async & scheduling pools with graceful shutdown so background jobs
 * (overdue task alerts, orphan media cleanup, Facebook auto-sync) and outbound
 * mail/integration I/O never starve each other or get abruptly killed on deploy.
 */
@Configuration
@EnableAsync
@Slf4j
public class SchedulingConfig {

    @Configuration
    @EnableScheduling
    @ConditionalOnProperty(value = "app.scheduling.enabled", havingValue = "true", matchIfMissing = true)
    static class SchedulerConfiguration implements SchedulingConfigurer {

        @Bean(name = "vjuTaskScheduler")
        public ThreadPoolTaskScheduler vjuTaskScheduler() {
            ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
            scheduler.setPoolSize(4);
            scheduler.setThreadNamePrefix("vju-sched-");
            scheduler.setWaitForTasksToCompleteOnShutdown(true);
            scheduler.setAwaitTerminationSeconds(30);
            scheduler.setErrorHandler(err -> log.error("Uncaught error in scheduled task: {}", err.getMessage(), err));
            scheduler.initialize();
            return scheduler;
        }

        @Override
        public void configureTasks(ScheduledTaskRegistrar taskRegistrar) {
            taskRegistrar.setTaskScheduler(vjuTaskScheduler());
        }
    }

    @Bean(name = "integrationTaskExecutor")
    public Executor integrationTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(6);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("vju-int-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.setRejectedExecutionHandler((r, pool) ->
                log.warn("Integration executor queue saturated (active={}, queued={}); dropping task",
                        pool.getActiveCount(), pool.getQueue().size()));
        executor.initialize();
        return executor;
    }

    @Bean(name = "mailTaskExecutor")
    public Executor mailTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(3);
        executor.setQueueCapacity(256);
        executor.setThreadNamePrefix("vju-mail-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.setRejectedExecutionHandler((r, pool) ->
                log.warn("Mail executor queue saturated (active={}, queued={}); skipping outbound alert email",
                        pool.getActiveCount(), pool.getQueue().size()));
        executor.initialize();
        return executor;
    }
}
