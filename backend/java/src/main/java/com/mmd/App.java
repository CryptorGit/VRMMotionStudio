package com.mmd;

import com.mmd.controller.UserController;

public class App {
    public static void main(String[] args) {
        UserController controller = new UserController();
        System.out.println(controller.getGreeting("token", 1));
    }
}
