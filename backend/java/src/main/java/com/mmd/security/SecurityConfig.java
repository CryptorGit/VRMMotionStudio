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
    public boolean isAuthorized(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }

        // JWTの場合: "Bearer "で始まるトークンを検証
        if (token.startsWith("Bearer ")) {
            String jwt = token.substring(7);
            String secret = System.getenv("JWT_SECRET");
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
        String apiKey = System.getenv("API_KEY");
        return apiKey != null && apiKey.equals(token);
    }
}
