package com.mmd.entity;

public class UserEntity {
    private final int id;
    private final String name;

    public UserEntity(int id, String name) {
        this.id = id;
        this.name = name;
    }

    public int getId() {
        return id;
    }

    public String getName() {
        return name;
    }
}
