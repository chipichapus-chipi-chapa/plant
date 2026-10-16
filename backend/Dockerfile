# Образ сервера для хостинга (Render собирает его прямо из репозитория).
# Тесты здесь не запускаются: им нужен Docker (Testcontainers), их гоняет CI на GitHub.
FROM eclipse-temurin:17-jdk AS build
WORKDIR /src
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN ./mvnw -q -B dependency:go-offline
COPY src src
RUN ./mvnw -q -B package -DskipTests && cp target/*.jar app.jar

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /src/app.jar app.jar
# Бесплатный тариф даёт 512 МБ: куча — 70% памяти контейнера, простой сборщик мусора
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC -Xss512k"
ENV SERVER_ADDRESS=0.0.0.0
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]
