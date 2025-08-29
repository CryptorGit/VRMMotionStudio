package com.mmd.security;

import org.springframework.stereotype.Component;

@Component
public class SecurityConfig {
    public boolean isAuthorized(String token) {
        // 簡易的な認証チェックのスタブ
        return token != null && !token.isEmpty();
    }
}
