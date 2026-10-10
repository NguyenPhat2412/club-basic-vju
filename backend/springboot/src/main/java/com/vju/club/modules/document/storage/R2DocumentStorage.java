package com.vju.club.modules.document.storage;

import com.vju.club.config.StorageProperties;
import com.vju.club.modules.document.exception.DocumentStorageException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ContentDisposition;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.checksums.RequestChecksumCalculation;
import software.amazon.awssdk.core.checksums.ResponseChecksumValidation;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.io.InputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public class R2DocumentStorage implements DocumentStorage, AutoCloseable {
    private static final Logger log = LoggerFactory.getLogger(R2DocumentStorage.class);
    private static final Region REGION = Region.of("auto");

    private final S3Client client;
    private final S3Presigner presigner;
    private final String bucket;

    R2DocumentStorage(S3Client client, S3Presigner presigner, String bucket) {
        this.client = client;
        this.presigner = presigner;
        this.bucket = bucket;
    }

    public static R2DocumentStorage create(StorageProperties.R2 settings) {
        List<String> missing = new ArrayList<>();
        if (isBlank(settings.getEndpoint())) missing.add("R2_ENDPOINT");
        if (isBlank(settings.getBucket())) missing.add("R2_BUCKET");
        if (isBlank(settings.getAccessKeyId())) missing.add("R2_ACCESS_KEY_ID");
        if (isBlank(settings.getSecretAccessKey())) missing.add("R2_SECRET_ACCESS_KEY");
        if (!missing.isEmpty()) {
            throw new IllegalStateException("app.storage.type=r2 needs " + String.join(", ", missing));
        }
        URI endpoint = URI.create(settings.getEndpoint().strip());
        var credentials = StaticCredentialsProvider.create(
                AwsBasicCredentials.create(settings.getAccessKeyId().strip(), settings.getSecretAccessKey().strip()));
        S3Configuration s3 = S3Configuration.builder().pathStyleAccessEnabled(true).build();
        S3Client client = S3Client.builder()
                .endpointOverride(endpoint).region(REGION).credentialsProvider(credentials)
                .serviceConfiguration(s3)
                .requestChecksumCalculation(RequestChecksumCalculation.WHEN_REQUIRED)
                .responseChecksumValidation(ResponseChecksumValidation.WHEN_REQUIRED)
                .build();
        S3Presigner presigner = S3Presigner.builder()
                .endpointOverride(endpoint).region(REGION).credentialsProvider(credentials)
                .serviceConfiguration(s3)
                .build();
        return new R2DocumentStorage(client, presigner, settings.getBucket().strip());
    }

    @Override
    public void put(String key, InputStream content, long size, String contentType) {
        try {
            client.putObject(request -> request.bucket(bucket).key(key).contentType(contentType).contentLength(size),
                    RequestBody.fromInputStream(content, size));
        } catch (SdkException exception) {
            log.error("R2 upload of {} failed", key, exception);
            throw new DocumentStorageException("Could not store the file", exception);
        }
    }

    @Override
    public StoredObject open(String key) {
        try {
            var stream = client.getObject(request -> request.bucket(bucket).key(key));
            GetObjectResponse response = stream.response();
            return new StoredObject(stream, response.contentLength());
        } catch (SdkException exception) {
            log.error("R2 download of {} failed", key, exception);
            throw new DocumentStorageException("Could not read the stored file", exception);
        }
    }

    @Override
    public void delete(String key) {
        try {
            client.deleteObject(request -> request.bucket(bucket).key(key));
        } catch (SdkException exception) {
            log.error("R2 delete of {} failed", key, exception);
            throw new DocumentStorageException("Could not delete the stored file", exception);
        }
    }

    @Override
    public Optional<URI> presignDownload(String key, String fileName, String contentType, Duration ttl) {
        String disposition = ContentDisposition.attachment().filename(fileName, StandardCharsets.UTF_8).build().toString();
        var signed = presigner.presignGetObject(presign -> presign.signatureDuration(ttl)
                .getObjectRequest(get -> get.bucket(bucket).key(key)
                        .responseContentDisposition(disposition).responseContentType(contentType)));
        try {
            return Optional.of(signed.url().toURI());
        } catch (java.net.URISyntaxException exception) {
            throw new DocumentStorageException("Could not sign a download link", exception);
        }
    }

    @Override
    public void close() {
        presigner.close();
        client.close();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
