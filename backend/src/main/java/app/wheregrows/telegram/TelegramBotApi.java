package app.wheregrows.telegram;

/** Вызовы Bot API, которые нужны игре. Отдельный интерфейс — чтобы в тестах не ходить в Telegram. */
public interface TelegramBotApi {

    /** Сообщение с одной кнопкой, открывающей Mini App. */
    void sendWebAppButton(long chatId, String text, String buttonText, String webAppUrl);

    /** Куда Telegram присылает обновления; secret вернётся в заголовке каждого запроса. */
    void setWebhook(String url, String secret);

    /** Кнопка меню у поля ввода во всех чатах с ботом. */
    void setMenuButton(String text, String webAppUrl);

    /** Простое сообщение без кнопок. */
    void sendText(long chatId, String text);

    /** Имя бота (без @) — для ссылок вида t.me/<имя>. */
    String username();
}
