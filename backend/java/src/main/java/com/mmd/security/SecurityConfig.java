package com.mmd.security;

import org.springframework.stereotype.Component;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class SecurityConfig {

    private volatile String jwtSecret;
    private volatile String apiKey;

    public SecurityConfig() {
        reload();
    }

    public void reload() {
        this.jwtSecret = System.getenv("JWT_SECRET");
        this.apiKey = System.getenv("API_KEY");
    }

    public boolean isAuthorized(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }

        // JWTの場合: "Bearer "で始まるトークンを検証
        if (token.startsWith("Bearer ")) {
            String jwt = token.substring(7);
            String secret = this.jwtSecret;
            if (secret == null || secret.isBlank()) {
                return false;
            }
            try {
                Jws<Claims> claims = Jwts.parserBuilder()
                        .setSigningKey(secret.getBytes(StandardCharsets.UTF_8))
                        .build()
                        .parseClaimsJws(jwt);
                Date exp = claims.getBody().getExpiration();
                return exp == null || exp.after(new Date());
            } catch (JwtException | IllegalArgumentException e) {
                return false;
            }
        }

        // APIキーの場合: 固定のキーと一致するかを確認
        String key = this.apiKey;
        return key != null && key.equals(token);
    }
}
