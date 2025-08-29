package com.mmd.security;

public class SecurityConfig {
    public boolean isAuthorized(String token) {
        // 簡易的な認証チェックのスタブ
        return token != null && !token.isEmpty();
    }
}
