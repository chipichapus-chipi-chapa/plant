package app.wheregrows.mentor;

import java.util.List;

import app.wheregrows.economy.ItemGrant;

/** Итог разговора: какой флаг поставлен и что подарено (подарок — только при первой установке флага). */
public record FinishResult(String dialogueKey, String flag, List<ItemGrant> gift) {
}
