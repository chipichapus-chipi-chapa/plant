package app.wheregrows.garden;

import java.io.IOException;
import java.io.InputStream;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import tools.jackson.databind.json.JsonMapper;

/** Загружает карту сада при старте и проверяет её. Сейчас локация одна — домашний сад. */
@Component
public class GardenMaps {

    private final GardenMap home;

    GardenMaps(JsonMapper json) throws IOException {
        try (InputStream in = new ClassPathResource("content/gardens/home.json").getInputStream()) {
            this.home = json.readValue(in, GardenMap.class);
        }
        home.validate();
    }

    public GardenMap home() {
        return home;
    }
}
