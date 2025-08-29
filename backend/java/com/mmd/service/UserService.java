package com.mmd.service;

import com.mmd.repository.UserRepository;
import com.mmd.dto.UserDTO;
import com.mmd.entity.UserEntity;
import com.mmd.model.User;

public class UserService {
    private final UserRepository repository = new UserRepository();

    public UserDTO getUser(int id) {
        UserEntity entity = repository.findById(id);
        User user = new User(entity.getId(), entity.getName());
        return new UserDTO(user.getId(), user.getName());
    }
}
