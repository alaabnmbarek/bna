FROM maven:3.9.7-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -q -e -DskipTests dependency:go-offline
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -q -DskipTests package

FROM maven:3.9.7-eclipse-temurin-17
ENV TZ=UTC
WORKDIR /app
COPY --from=build /app/target/secureapp-0.0.1-SNAPSHOT.jar app.jar
RUN useradd -r -u 1001 appuser
USER appuser
EXPOSE 8080
ENTRYPOINT ["java","-XX:MaxRAMPercentage=75.0","-XX:+UseContainerSupport","-Djava.security.egd=file:/dev/./urandom","-jar","/app/app.jar"]
