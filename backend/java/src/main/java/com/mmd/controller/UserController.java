package com.mmd.controller;

import com.mmd.security.SecurityConfig;
import com.mmd.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;
    private final SecurityConfig security;

    @Autowired
    public UserController(UserService userService, SecurityConfig security) {
        this.userService = userService;
        this.security = security;
    }

    @GetMapping("/{id}/greeting")
    public ResponseEntity<String> getGreeting(
            @RequestHeader(value = "Authorization", required = false) String token,
            @PathVariable("id") int userId) {
        if (!security.isAuthorized(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }
        return userService.getUser(userId)
                .map(user -> ResponseEntity.ok("Hello, " + user.getName()))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found"));
    }
}
