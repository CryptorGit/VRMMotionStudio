package com.mmd.service;

import com.mmd.repository.UserRepository;
import com.mmd.entity.UserEntity;

public class UserService {
    private final UserRepository repository = new UserRepository();

    public UserEntity getUser(int id) {
        return repository.findById(id);
    }
}
