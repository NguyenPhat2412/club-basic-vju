package com.vju.club.repository;

import com.vju.club.entity.NotificationCampaign;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface NotificationCampaignRepository extends JpaRepository<NotificationCampaign, UUID> {
    Page<NotificationCampaign> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<NotificationCampaign> findByCreatedByOrderByCreatedAtDesc(UUID createdBy, Pageable pageable);
}
