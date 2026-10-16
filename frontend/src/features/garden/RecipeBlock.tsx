import { useState } from 'react'
import { ApiError } from '../../api/client'
import { castRecipe } from '../../api/game'
import { SUN_SPARK, type Catalog, type GameState, type Recipe } from '../../api/types'
import { Button } from '../../ui/Button'
import { ItemIcon } from '../../ui/icons/ItemIcon'
import { useToast } from '../notifications/Toasts'
import styles from './RecipeBlock.module.css'

type Props = {
  recipe: Recipe
  state: GameState
  catalog: Catalog
  onChanged: () => Promise<void>
}

/** Рецепт у магического объекта: что нужно, сколько есть, кнопка пробуждения. */
export function RecipeBlock({ recipe, state, catalog, onChanged }: Props) {
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const awakened = state.worldObjects.some((w) => w.objectKey === recipe.targetObjectKey)

  if (awakened) {
    return <p className={styles.result}>{recipe.resultText}</p>
  }

  const have = (itemKey: string) => state.inventory.find((e) => e.itemKey === itemKey)?.quantity ?? 0
  const missing = recipe.ingredients.filter((i) => have(i.itemKey) < i.quantity)
  const enough = missing.length === 0
  // Подсказка о том, откуда берётся недостающее, — без давления и сроков
  const missingTool = missing.map((i) => catalog.items.find((item) => item.key === i.itemKey)).find((item) => item?.kind === 'TOOL')
  const hint = missingTool
    ? `Нужен ${missingTool.name.toLowerCase()}. ${recipe.description.split('. ').slice(1).join('. ')}`.trim()
    : missing.some((i) => i.itemKey === SUN_SPARK)
      ? 'Солнечные искры находят при важных открытиях. Мерцание над постройкой подскажет, где стоит поискать.'
      : 'Осколки приходят за привычки нужного цвета. Ничего не сгорит, пока копятся.'

  const cast = async () => {
    setBusy(true)
    try {
      const result = await castRecipe(recipe.key)
      toast({ message: result.resultText })
      await onChanged()
    } catch (e) {
      toast({ message: e instanceof ApiError ? (e.detail ?? e.title) : 'Не получилось. Попробуйте ещё раз.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.recipe}>
      <p className={styles.name}>
        <strong>{recipe.name}.</strong> {recipe.description}
      </p>
      <ul className={styles.ingredients}>
        {recipe.ingredients.map((ingredient) => {
          const item = catalog.items.find((i) => i.key === ingredient.itemKey)
          const color = catalog.crystals.find((c) => c.key === item?.crystalCategory)?.color
          const count = have(ingredient.itemKey)
          return (
            <li key={ingredient.itemKey} className={count >= ingredient.quantity ? styles.ok : styles.short}>
              <ItemIcon itemKey={ingredient.itemKey} kind={item?.kind} color={color} />
              <span>{item?.name ?? ingredient.itemKey}</span>
              <span className={styles.count}>
                {Math.min(count, ingredient.quantity)}/{ingredient.quantity}
              </span>
            </li>
          )
        })}
      </ul>
      <Button onClick={() => void cast()} disabled={!enough || busy}>
        {recipe.actionLabel}
      </Button>
      {!enough && <p className={styles.hint}>{hint}</p>}
    </div>
  )
}
