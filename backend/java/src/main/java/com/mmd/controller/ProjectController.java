package com.mmd.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects")
@CrossOrigin(origins = "*")
public class ProjectController {

    private static final String UPLOAD_DIR = "uploads/projects";
    private static final long MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

    public ProjectController() {
        // Create upload directory if it doesn't exist
        try {
            Files.createDirectories(Paths.get(UPLOAD_DIR));
            System.out.println("Project upload directory initialized: " + UPLOAD_DIR);
        } catch (IOException e) {
            System.err.println("Failed to create upload directory: " + e.getMessage());
        }
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadProject(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "projectName", required = false) String projectName) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Validate file
            if (file.isEmpty()) {
                response.put("success", false);
                response.put("error", "ファイルが空です");
                return ResponseEntity.badRequest().body(response);
            }

            if (file.getSize() > MAX_FILE_SIZE) {
                response.put("success", false);
                response.put("error", "ファイルサイズが大きすぎます (最大: 100MB)");
                return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(response);
            }

            // Validate file type
            String contentType = file.getContentType();
            if (!contentType.equals("application/json") && 
                !file.getOriginalFilename().endsWith(".json")) {
                response.put("success", false);
                response.put("error", "JSONファイルのみアップロード可能です");
                return ResponseEntity.badRequest().body(response);
            }

            // Generate unique filename
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String uniqueId = UUID.randomUUID().toString().substring(0, 8);
            String originalFilename = file.getOriginalFilename();
            String extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            String filename = String.format("project_%s_%s%s", timestamp, uniqueId, extension);

            // Save file
            Path uploadPath = Paths.get(UPLOAD_DIR);
            Path filePath = uploadPath.resolve(filename);
            
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // Prepare response
            response.put("success", true);
            response.put("filename", filename);
            response.put("originalFilename", originalFilename);
            response.put("projectName", projectName);
            response.put("size", file.getSize());
            response.put("uploadTime", LocalDateTime.now().toString());
            response.put("path", filePath.toString());
            
            System.out.println("Project uploaded successfully: " + filename + " (Size: " + file.getSize() + " bytes)");
            
            return ResponseEntity.ok(response);
            
        } catch (IOException e) {
            System.err.println("File upload error: " + e.getMessage());
            response.put("success", false);
            response.put("error", "ファイルのアップロードに失敗しました: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        } catch (Exception e) {
            System.err.println("Unexpected error during file upload: " + e.getMessage());
            response.put("success", false);
            response.put("error", "予期しないエラーが発生しました: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/list")
    public ResponseEntity<Map<String, Object>> listProjects() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Path uploadPath = Paths.get(UPLOAD_DIR);
            File[] files = uploadPath.toFile().listFiles((dir, name) -> name.endsWith(".json"));
            
            java.util.List<Map<String, Object>> projectList = new java.util.ArrayList<>();
            
            if (files != null) {
                for (File file : files) {
                    Map<String, Object> fileInfo = new HashMap<>();
                    fileInfo.put("filename", file.getName());
                    fileInfo.put("size", file.length());
                    fileInfo.put("lastModified", new java.util.Date(file.lastModified()).toString());
                    projectList.add(fileInfo);
                }
            }
            
            response.put("success", true);
            response.put("projects", projectList);
            response.put("count", projectList.size());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("Error listing projects: " + e.getMessage());
            response.put("success", false);
            response.put("error", "プロジェクト一覧の取得に失敗しました: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
