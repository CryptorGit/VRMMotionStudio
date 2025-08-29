package com.mmd.controller;

import com.mmd.service.UserService;

public class UserController {
    private final UserService userService = new UserService();

    public String getGreeting() {
        return "Hello, " + userService.getUserName();
    }
}
