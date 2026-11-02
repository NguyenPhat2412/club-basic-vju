package com.vju.club.mapper;

import com.vju.club.dto.record.DocumentRecord;
import com.vju.club.dto.response.DocumentResponse;
import com.vju.club.dto.response.DocumentVersionResponse;
import com.vju.club.entity.Document;
import com.vju.club.entity.DocumentVersion;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper
public interface DocumentMapper {
    @Mapping(target = "clubId", source = "club.id")
    @Mapping(target = "ownerId", source = "owner.id")
    DocumentResponse toResponse(Document document);

    @Mapping(target = "clubId", source = "club.id")
    @Mapping(target = "ownerId", source = "owner.id")
    DocumentRecord toRecord(Document document);

    @Mapping(target = "documentId", source = "document.id")
    DocumentVersionResponse toVersionResponse(DocumentVersion version);
}
