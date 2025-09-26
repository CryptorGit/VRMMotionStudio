package com.mmd.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class LogController {
    private static final Logger logger = LoggerFactory.getLogger(LogController.class);

    @PostMapping("/log")
    public ResponseEntity<Map<String, Object>> log(@RequestBody(required = false) Map<String, Object> body) {
        try {
            if (body == null || body.isEmpty()) {
                logger.info("[frontend] (empty)");
            } else {
                logger.info("[frontend] {}", body);
            }
        } catch (Exception e) {
            // swallow errors to avoid impacting FE
        }
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
