package app.wheregrows.exploration;

import java.util.List;

import app.wheregrows.economy.ItemGrant;

/**
 * Итог поиска в месте находки.
 *
 * @param outcome  FOUND — нашли (награда и, возможно, артефакт); EMPTY — здесь уже всё найдено;
 *                 LOCKED — пока не найти (нужно что-то пробудить), ничего не потрачено и не отмечено
 * @param artifact артефакт, попавший в коллекцию, или null
 */
public record SearchResult(String spotKey, Outcome outcome, String text, List<ItemGrant> reward,
                           FoundArtifact artifact) {

    public enum Outcome { FOUND, EMPTY, LOCKED }

    public record FoundArtifact(String key, String name) {
    }
}
