# Java Backend (Spring Boot)

Spring Boot 3 backend service for VRM Motion Studio.

## Technology

- Spring Boot 3.3.2
- Java 17
- Maven 3.9+
- H2 Database (development)
- PostgreSQL (production)

## Run

```bash
mvn spring-boot:run
```

## Build

```bash
mvn clean package
java -jar target/java-0.1.0.jar
```

## Package Structure

```
com.mmd/
├── controller/    # REST API endpoints
├── service/       # Business logic
├── security/      # JWT & API key authentication
├── repository/    # JPA data access
└── model/entity/  # Database entities
```

See [API Documentation](../../docs/API.md) for endpoint details.
