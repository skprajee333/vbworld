import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChefHat, Plus, Save, Search, Trash2 } from 'lucide-react'
import { getItems, getRecipes, saveRecipe } from '../../api'

type ItemOption = {
  id: string
  code: string
  name: string
  category?: string
  unit?: string
}

type RecipeLine = {
  ingredientItemId: string
  quantityRequired: string
  wastagePct: string
  notes: string
}

type RecipeRecord = {
  id: string
  menuItemId: string
  menuItemCode: string
  menuItemName: string
  menuItemCategory?: string
  outputQuantity: number
  active: boolean
  notes?: string
  ingredients: Array<{
    id: string
    ingredientItemId: string
    ingredientItemCode: string
    ingredientItemName: string
    ingredientCategory?: string
    ingredientUnit?: string
    quantityRequired: number
    wastagePct: number
    notes?: string
  }>
}

const emptyLine = (): RecipeLine => ({ ingredientItemId: '', quantityRequired: '', wastagePct: '0', notes: '' })

export default function RecipesPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedRecipeId, setSelectedRecipeId] = useState('')
  const [menuItemId, setMenuItemId] = useState('')
  const [outputQuantity, setOutputQuantity] = useState('1')
  const [notes, setNotes] = useState('')
  const [active, setActive] = useState(true)
  const [ingredients, setIngredients] = useState<RecipeLine[]>([emptyLine()])

  const { data: items = [] } = useQuery({
    queryKey: ['recipe-items'],
    queryFn: () => getItems({ size: 300 }),
    select: res => (res.data.data?.content || []) as ItemOption[],
  })

  const { data: recipes = [] } = useQuery({
    queryKey: ['recipes', search],
    queryFn: () => getRecipes(search || undefined),
    select: res => (res.data.data || []) as RecipeRecord[],
  })

  const itemOptions = useMemo(() => items.map(item => ({ ...item, label: `${item.name} (${item.code})` })), [items])
  const ingredientOptions = useMemo(() => itemOptions.filter(item => item.id !== menuItemId), [itemOptions, menuItemId])

  const saveMutation = useMutation({
    mutationFn: () => saveRecipe({
      menuItemId,
      outputQuantity: Number(outputQuantity || 1),
      notes: notes || null,
      active,
      ingredients: ingredients
        .filter(line => line.ingredientItemId && Number(line.quantityRequired || 0) > 0)
        .map(line => ({
          ingredientItemId: line.ingredientItemId,
          quantityRequired: Number(line.quantityRequired),
          wastagePct: Number(line.wastagePct || 0),
          notes: line.notes || null,
        })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipes'] })
    },
  })

  function loadRecipe(recipe: RecipeRecord) {
    setSelectedRecipeId(recipe.id)
    setMenuItemId(recipe.menuItemId)
    setOutputQuantity(String(recipe.outputQuantity || 1))
    setNotes(recipe.notes || '')
    setActive(recipe.active)
    setIngredients(recipe.ingredients.length
      ? recipe.ingredients.map(line => ({
          ingredientItemId: line.ingredientItemId,
          quantityRequired: String(line.quantityRequired),
          wastagePct: String(line.wastagePct || 0),
          notes: line.notes || '',
        }))
      : [emptyLine()])
  }

  function resetForm() {
    setSelectedRecipeId('')
    setMenuItemId('')
    setOutputQuantity('1')
    setNotes('')
    setActive(true)
    setIngredients([emptyLine()])
  }

  function updateIngredient(index: number, field: keyof RecipeLine, value: string) {
    setIngredients(current => current.map((line, i) => i === index ? { ...line, [field]: value } : line))
  }

  return (
    <div style={{ display: 'grid', gap: 18, maxWidth: 1360 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--text)' }}>Recipe And Consumption Engine</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 12 }}>
          Map POS menu items to warehouse ingredients so kitchen KOT automatically consumes inventory.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16, alignItems: 'start' }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 900, color: 'var(--text)' }}>{selectedRecipeId ? 'Edit Recipe' : 'New Recipe'}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Define ingredient usage per sold menu quantity.</div>
            </div>
            <button onClick={resetForm} style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', fontWeight: 700 }}>
              Reset
            </button>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            <select value={menuItemId} onChange={e => setMenuItemId(e.target.value)} style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
              <option value="">Select menu item</option>
              {itemOptions.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>

            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 10 }}>
              <input value={outputQuantity} onChange={e => setOutputQuantity(e.target.value)} placeholder="Recipe yield" style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, fontWeight: 700 }}>
                <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
                Recipe active for live POS consumption
              </label>
            </div>

            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Preparation notes, kitchen assumptions, or costing comments" style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', resize: 'none' }} />
          </div>

          <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 800, color: 'var(--text)' }}>Ingredient Lines</div>
              <button onClick={() => setIngredients(current => [...current, emptyLine()])} style={{ padding: '8px 10px', borderRadius: 10, border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={14} /> Add Ingredient
              </button>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              {ingredients.map((line, index) => {
                const selectedItem = items.find(item => item.id === line.ingredientItemId)
                return (
                  <div key={index} style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.7fr 0.7fr auto', gap: 10, padding: 12, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface)' }}>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <select value={line.ingredientItemId} onChange={e => updateIngredient(index, 'ingredientItemId', e.target.value)} style={{ padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }}>
                        <option value="">Select ingredient</option>
                        {ingredientOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                      </select>
                      <input value={line.notes} onChange={e => updateIngredient(index, 'notes', e.target.value)} placeholder="Optional note" style={{ padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }} />
                    </div>
                    <div>
                      <input value={line.quantityRequired} onChange={e => updateIngredient(index, 'quantityRequired', e.target.value)} placeholder="Qty" style={{ width: '100%', padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }} />
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6 }}>{selectedItem?.unit || 'Unit'}</div>
                    </div>
                    <div>
                      <input value={line.wastagePct} onChange={e => updateIngredient(index, 'wastagePct', e.target.value)} placeholder="Wastage %" style={{ width: '100%', padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }} />
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6 }}>Extra prep loss</div>
                    </div>
                    <button onClick={() => setIngredients(current => current.length === 1 ? current : current.filter((_, i) => i !== index))} disabled={ingredients.length === 1} style={{ width: 42, height: 42, alignSelf: 'start', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: '#ef4444', cursor: 'pointer', opacity: ingredients.length === 1 ? 0.4 : 1 }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !menuItemId} style={{ padding: '10px 14px', borderRadius: 12, border: 'none', background: '#111827', color: '#fff', cursor: 'pointer', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, opacity: !menuItemId ? 0.6 : 1 }}>
              <Save size={15} /> {saveMutation.isPending ? 'Saving...' : 'Save Recipe'}
            </button>
          </div>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 900, color: 'var(--text)' }}>Mapped Recipes</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{recipes.length} configured menu items</div>
            </div>
            <div style={{ position: 'relative', width: 220 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--muted)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search recipes" style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gap: 10, maxHeight: 760, overflow: 'auto' }}>
            {recipes.map(recipe => (
              <button key={recipe.id} onClick={() => loadRecipe(recipe)} style={{ textAlign: 'left', padding: 14, borderRadius: 14, border: recipe.id === selectedRecipeId ? '1px solid #6366f1' : '1px solid var(--border)', background: recipe.id === selectedRecipeId ? '#6366f112' : 'var(--surface)', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ChefHat size={15} /> {recipe.menuItemName}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{recipe.menuItemCode} ? {recipe.menuItemCategory || 'Uncategorized'}</div>
                  </div>
                  <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 999, background: recipe.active ? '#10b98122' : '#94a3b822', color: recipe.active ? '#10b981' : '#94a3b8', fontWeight: 800 }}>{recipe.active ? 'LIVE' : 'PAUSED'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 10, fontSize: 12 }}>
                  <span style={{ color: 'var(--muted)' }}>{recipe.ingredients.length} ingredients</span>
                  <span style={{ color: '#6366f1', fontWeight: 700 }}>Yield {recipe.outputQuantity}</span>
                </div>
                <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                  {recipe.ingredients.slice(0, 3).map(line => (
                    <div key={line.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11 }}>
                      <span style={{ color: 'var(--text)' }}>{line.ingredientItemName}</span>
                      <span style={{ color: 'var(--muted)' }}>{line.quantityRequired} {line.ingredientUnit}</span>
                    </div>
                  ))}
                  {recipe.ingredients.length > 3 && <div style={{ fontSize: 10, color: 'var(--muted)' }}>+{recipe.ingredients.length - 3} more</div>}
                </div>
              </button>
            ))}
            {recipes.length === 0 && (
              <div style={{ padding: 18, borderRadius: 14, border: '1px dashed var(--border)', color: 'var(--muted)', fontSize: 12, textAlign: 'center' }}>
                No recipes configured yet. Create one to turn POS KOT into stock consumption.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
