package com.mmd.repository;

import com.mmd.entity.UserEntity;

public class UserRepository {
    public UserEntity findById(int id) {
        // 実際の実装ではデータベース等から取得
        return new UserEntity(id, "World");
    }
}
