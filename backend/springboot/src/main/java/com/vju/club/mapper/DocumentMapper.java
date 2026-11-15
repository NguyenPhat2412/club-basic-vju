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
    @Mapping(target = "departmentId", source = "department.id")
    @Mapping(target = "departmentName", source = "department.name")
    @Mapping(target = "scope", expression = "java(document.getScope() != null ? document.getScope().name() : \"CLUB\")")
    @Mapping(target = "visibility", expression = "java(document.getVisibility() != null ? document.getVisibility().name() : \"MEMBERS\")")
    @Mapping(target = "ownerId", source = "owner.id")
    @Mapping(target = "previewable", expression = "java(isPreviewable(document.getContentType()))")
    DocumentResponse toResponse(Document document);

    @Mapping(target = "clubId", source = "club.id")
    @Mapping(target = "ownerId", source = "owner.id")
    DocumentRecord toRecord(Document document);

    @Mapping(target = "documentId", source = "document.id")
    DocumentVersionResponse toVersionResponse(DocumentVersion version);

    default boolean isPreviewable(String contentType) {
        if (contentType == null) return false;
        return contentType.equals("application/pdf")
                || contentType.startsWith("image/")
                || contentType.startsWith("text/");
    }
}
