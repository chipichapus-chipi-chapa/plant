package app.wheregrows.mentor;

import java.io.IOException;
import java.io.InputStream;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import tools.jackson.databind.json.JsonMapper;

/** Загружает и проверяет диалоги наставника при старте. */
@Component
public class MentorContentLoader {

    private final MentorContent content;

    MentorContentLoader(JsonMapper json) throws IOException {
        try (InputStream in = new ClassPathResource("content/mentor/vereshk.json").getInputStream()) {
            this.content = json.readValue(in, MentorContent.class);
        }
        content.validate();
    }

    public MentorContent content() {
        return content;
    }
}
