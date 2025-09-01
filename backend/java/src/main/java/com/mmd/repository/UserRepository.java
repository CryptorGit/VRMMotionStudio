package com.mmd.repository;

import com.mmd.model.entity.UserEntity;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public class UserRepository {
    public Optional<UserEntity> findById(int id) {
        // 実際の実装ではデータベース等から取得
        return Optional.of(new UserEntity(id, "World"));
    }
}
