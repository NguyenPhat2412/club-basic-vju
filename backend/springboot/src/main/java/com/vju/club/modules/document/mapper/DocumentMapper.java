package com.vju.club.modules.document.mapper;

import com.vju.club.modules.document.dto.response.DocumentResponse;
import com.vju.club.modules.document.dto.response.DocumentVersionResponse;
import com.vju.club.modules.document.entity.Document;
import com.vju.club.modules.document.entity.DocumentVersion;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper
public interface DocumentMapper {
    @Mapping(target = "clubId", source = "club.id")
    @Mapping(target = "ownerId", source = "owner.id")
    DocumentResponse toResponse(Document document);

    @Mapping(target = "documentId", source = "document.id")
    DocumentVersionResponse toVersionResponse(DocumentVersion version);
}
