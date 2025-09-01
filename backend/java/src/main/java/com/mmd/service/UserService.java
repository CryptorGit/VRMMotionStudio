package com.mmd.service;

import com.mmd.repository.UserRepository;
import com.mmd.model.entity.UserEntity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Optional;

@Service
public class UserService {
    private final UserRepository repository;

    @Autowired
    public UserService(UserRepository repository) {
        this.repository = repository;
    }

    public Optional<UserEntity> getUser(int id) {
        return repository.findById(id);
    }
}
