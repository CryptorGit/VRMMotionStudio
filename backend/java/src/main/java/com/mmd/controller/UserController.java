package com.mmd.controller;

import com.mmd.security.SecurityConfig;
import com.mmd.service.UserService;
import com.mmd.entity.UserEntity;

public class UserController {
    private final UserService userService = new UserService();
    private final SecurityConfig security = new SecurityConfig();

    public String getGreeting(String token, int userId) {
        if (!security.isAuthorized(token)) {
            return "Unauthorized";
        }
        UserEntity user = userService.getUser(userId);
        return "Hello, " + user.getName();
    }
}
