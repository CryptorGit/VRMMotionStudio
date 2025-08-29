package com.mmd.controller;

import com.mmd.security.SecurityConfig;
import com.mmd.service.UserService;
import com.mmd.dto.UserDTO;

public class UserController {
    private final UserService userService = new UserService();
    private final SecurityConfig security = new SecurityConfig();

    public String getGreeting(String token, int userId) {
        if (!security.isAuthorized(token)) {
            return "Unauthorized";
        }
        UserDTO user = userService.getUser(userId);
        return "Hello, " + user.getName();
    }
}
