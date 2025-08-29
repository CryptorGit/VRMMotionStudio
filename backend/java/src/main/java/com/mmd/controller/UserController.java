package com.mmd.controller;

import com.mmd.security.SecurityConfig;
import com.mmd.service.UserService;
import com.mmd.model.entity.UserEntity;
import org.springframework.beans.factory.annotation.Autowired;
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
    public String getGreeting(@RequestHeader(value = "Authorization", required = false) String token,
                              @PathVariable("id") int userId) {
        if (!security.isAuthorized(token)) {
            return "Unauthorized";
        }
        UserEntity user = userService.getUser(userId);
        return "Hello, " + user.getName();
    }
}
